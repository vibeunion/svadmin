import type { WorkspaceTab, WorkspaceTabStateAdapter } from '@svadmin/ui';

const SCROLL_INTENT_KEYS = new Set<string>([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar',
]);
const HORIZONTAL_OWNER_SELECTOR = '[data-slot="table-container"]';

export interface WorkspaceScrollController {
  snapshotTab(tab: WorkspaceTab): boolean;
  captureAllTabs(tabs: readonly WorkspaceTab[]): void;
  requestRestore(tab: WorkspaceTab): void;
  cancelRestore(tabId?: string): void;
  dispose(): void;
}

export interface WorkspaceScrollControllerOptions {
  getRoot: () => HTMLElement | undefined;
  getAdapter: () => WorkspaceTabStateAdapter | undefined;
  isDisposed: () => boolean;
  afterRender: () => Promise<unknown>;
}

export function createWorkspaceScrollController(
  options: WorkspaceScrollControllerOptions,
): WorkspaceScrollController {
  let restoreGeneration = 0;
  let restoringTabId: string | undefined;
  let stopRestoreWork: (() => void) | undefined;

  function paneScroller(id: string): HTMLElement | undefined {
    return options.getRoot()?.querySelector<HTMLElement>(`[data-workspace-scroll="${id}"]`) ?? undefined;
  }

  function isMeasurable(scroller: HTMLElement): boolean {
    // display:none 的隐藏面板没有 CSS box，读取 scrollTop 会得到 0；不要用假 0
    // 覆盖切换前已经保存的快照。
    return scroller.isConnected && scroller.getClientRects().length > 0;
  }

  function horizontalScroller(scroller: HTMLElement): HTMLElement {
    // AutoTable 的 .svadmin-table-container 才是 overflow-x:auto 的真实水平 owner；
    // 外层 data-workspace-scroll 只负责垂直滚动。内容尚未挂载时回退到外层。
    const candidates = scroller.querySelectorAll<HTMLElement>(HORIZONTAL_OWNER_SELECTOR);
    for (const candidate of candidates) {
      if (candidate.scrollWidth > candidate.clientWidth + 1) return candidate;
    }
    return scroller;
  }

  function isRestorePending(tabId: string): boolean {
    return restoringTabId === tabId && stopRestoreWork !== undefined;
  }

  function snapshotTab(tab: WorkspaceTab): boolean {
    const adapter = options.getAdapter();
    if (!adapter) return false;
    const scroller = paneScroller(tab.id);
    if (!scroller || !isMeasurable(scroller)) return false;
    const horizontal = horizontalScroller(scroller);
    const previous = adapter.restore({ id: tab.id, path: tab.path });
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const maxLeft = Math.max(0, horizontal.scrollWidth - horizontal.clientWidth);
    // 只有恢复仍真正处于 pending 时，当前收缩后的位置才不是用户位置。
    // 用户滚动会取消恢复；此后切换标签必须采集当前位置，不能复活不可达旧快照。
    if (
      isRestorePending(tab.id)
      && previous
      && (previous.scrollTop > maxTop + 1 || previous.scrollLeft > maxLeft + 1)
    ) {
      return false;
    }
    adapter.capture(
      { id: tab.id, path: tab.path },
      { scrollTop: scroller.scrollTop, scrollLeft: horizontal.scrollLeft },
    );
    return true;
  }

  function stopPendingRestore(): void {
    stopRestoreWork?.();
    stopRestoreWork = undefined;
    restoringTabId = undefined;
  }

  function cancelRestore(tabId?: string): void {
    if (tabId !== undefined && restoringTabId !== tabId) return;
    restoreGeneration += 1;
    stopPendingRestore();
  }

  function applyRestore(tab: WorkspaceTab): boolean {
    const adapter = options.getAdapter();
    if (!adapter) return false;
    const scroller = paneScroller(tab.id);
    const state = adapter.restore({ id: tab.id, path: tab.path });
    if (!scroller || !state) return false;
    const horizontal = horizontalScroller(scroller);
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const maxLeft = Math.max(0, horizontal.scrollWidth - horizontal.clientWidth);
    scroller.scrollTop = Math.min(state.scrollTop, maxTop);
    horizontal.scrollLeft = Math.min(state.scrollLeft, maxLeft);
    return (
      Math.abs(scroller.scrollTop - state.scrollTop) > 1
      || Math.abs(horizontal.scrollLeft - state.scrollLeft) > 1
    );
  }

  function setupRestore(tab: WorkspaceTab, generation: number): void {
    if (options.isDisposed() || generation !== restoreGeneration) return;
    const scroller = paneScroller(tab.id);
    if (!scroller) return;

    restoringTabId = tab.id;
    let frame = 0;
    let rafId: number | undefined;
    let observer: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    const observedTargets = new Set<Element>();
    let stopped = false;
    const listeners: Array<[string, (event: Event) => void]> = [];

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      observer?.disconnect();
      observedTargets.clear();
      mutationObserver?.disconnect();
      for (const [name, listener] of listeners) scroller.removeEventListener(name, listener, true);
      if (stopRestoreWork === stop) {
        stopRestoreWork = undefined;
        restoringTabId = undefined;
      }
    };
    stopRestoreWork = stop;

    // 用户主动滚动优先于迟到恢复；捕获阶段也能接住内部 table-container 的滚轮。
    const cancelForUser = () => {
      if (stopped) return;
      cancelRestore(tab.id);
    };
    const cancelOnScrollKey = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (SCROLL_INTENT_KEYS.has(event.key)) cancelForUser();
    };
    const cancelOnScrollbarPointer = (event: Event) => {
      const target = event.target;
      // 滚动条拖动的事件 target 就是滚动 owner 本身；点在内容里的普通点击不取消。
      if (target === scroller || (target instanceof Element && target.matches(HORIZONTAL_OWNER_SELECTOR))) {
        cancelForUser();
      }
    };
    const bindings: Array<[string, (event: Event) => void]> = [
      ['wheel', cancelForUser],
      ['touchstart', cancelForUser],
      ['keydown', cancelOnScrollKey],
      ['pointerdown', cancelOnScrollbarPointer],
    ];
    for (const [name, listener] of bindings) {
      scroller.addEventListener(name, listener, { passive: true, capture: true });
      listeners.push([name, listener]);
    }

    // 只增量观察新增目标；每次 attempt 都 disconnect/observe 会让 ResizeObserver
    // 的初始通知不断重新触发自己，退化成无限帧轮询。
    const observeSizes = () => {
      if (typeof ResizeObserver !== 'function') return;
      if (!observer) observer = new ResizeObserver(() => schedule());
      const next = new Set<Element>();
      next.add(scroller);
      const horizontal = horizontalScroller(scroller);
      if (horizontal !== scroller) next.add(horizontal);
      for (const candidate of scroller.querySelectorAll<HTMLElement>(HORIZONTAL_OWNER_SELECTOR)) {
        next.add(candidate);
      }
      for (const target of observedTargets) {
        if (!next.has(target)) {
          observer.unobserve(target);
          observedTargets.delete(target);
        }
      }
      for (const target of next) {
        if (observedTargets.has(target)) continue;
        observer.observe(target);
        observedTargets.add(target);
      }
    };

    // 内容晚挂载时外壳尺寸可能完全不变，必须观察子树新增的真实内容节点。
    if (typeof MutationObserver === 'function') {
      mutationObserver = new MutationObserver(() => {
        if (stopped) return;
        observeSizes();
        schedule();
      });
      mutationObserver.observe(scroller, { childList: true, subtree: true });
    }

    const schedule = () => {
      if (stopped || rafId !== undefined) return;
      if (typeof requestAnimationFrame !== 'function') {
        stop();
        return;
      }
      rafId = requestAnimationFrame(attempt);
    };

    const attempt = () => {
      rafId = undefined;
      if (stopped || options.isDisposed() || generation !== restoreGeneration) {
        stop();
        return;
      }
      const pending = applyRestore(tab);
      if (!pending) {
        stop();
        return;
      }
      observeSizes();
      // 首段沿用 60 帧有界重试；之后由尺寸变化驱动，慢于 60 帧的内容仍能恢复。
      if (frame < 60) {
        frame += 1;
        schedule();
      }
    };

    observeSizes();
    attempt();
  }

  return {
    snapshotTab,
    captureAllTabs(tabs) {
      for (const tab of tabs) snapshotTab(tab);
    },
    requestRestore(tab) {
      stopPendingRestore();
      const generation = ++restoreGeneration;
      void options.afterRender().then(() => setupRestore(tab, generation));
    },
    cancelRestore,
    dispose() {
      cancelRestore();
    },
  };
}
