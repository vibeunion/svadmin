import { expect, test, type Page } from '@playwright/test';

/**
 * 非业务外部资产隔离：example/index.html 在 head 同步引用
 * fonts.bunny.net 样式表，它会阻塞脚本、DOMContentLoaded 与 load。字体不是
 * 本 spec 的业务契约，因此测试内以空样式表隔离该外部网络依赖；不修改页面、
 * 不伪造后端数据，也不改变任何业务就绪或状态断言。
 *
 * 系统代理关闭是浏览器启动级配置，按引擎放在
 * playwright.workspace-tabs.cross-browser.config.ts 的 launchOptions 中；
 * 这里不再用 `test.use({ proxy })` 冒充 loopback 直连。
 */
async function isolateNonBusinessFontStylesheet(page: Page): Promise<void> {
  await page.route('**://fonts.bunny.net/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: '/* isolated non-business font stylesheet */',
  }));
}

test.beforeEach(async ({ page }) => {
  await isolateNonBusinessFontStylesheet(page);
});


interface WorkspaceLifecycleProbe {
  documentId: string;
  pagehideActive: number;
  windowHashchangeActive: number;
  windowPopstateActive: number;
  documentClickCaptureActive: number;
  workspaceGlobalListenerActive: number;
  resizeActive: number;
  mutationActive: number;
  scrollerListenerActive: number;
  workspaceRafScheduled: number;
  workspaceRafActive: number;
  staleRafScheduled: number;
  staleProbe: boolean;
}

/**
 * 只读包装浏览器原生资源 API，统计仅属于 workspace 的观察者、scroller 监听、
 * rAF 与全局监听。全局监听只统计调用栈可归因到 WorkspaceTabsPage 的
 * window pagehide/hashchange/popstate 与 document capture click，并保留监听
 * 实例 identity 与 capture 维度。scroller 进入时记入 WeakSet，离开后仍能正确扣减。
 */
async function installWorkspaceLifecycleProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type WorkspaceGlobalListenerKind =
      | 'pagehide'
      | 'hashchange'
      | 'popstate'
      | 'documentClick';
    const probe = {
      documentId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pagehideActive: 0,
      windowHashchangeActive: 0,
      windowPopstateActive: 0,
      documentClickCaptureActive: 0,
      workspaceGlobalListenerActive: 0,
      resizeActive: 0,
      mutationActive: 0,
      scrollerListenerActive: 0,
      workspaceRafScheduled: 0,
      workspaceRafActive: 0,
      staleRafScheduled: 0,
      staleProbe: false,
    };
    Object.defineProperty(window, '__wsLifecycleProbe', { value: probe, configurable: true });

    const workspaceRoot = () => document.querySelector('[data-app-page="workspace-tabs"]');
    const isWorkspaceNode = (target: Node): boolean => {
      const root = workspaceRoot();
      return root !== null && (root === target || root.contains(target));
    };
    const isWorkspaceScroller = (target: EventTarget | null): target is HTMLElement => (
      target instanceof Element &&
      target.matches('[data-workspace-scroll]') &&
      isWorkspaceNode(target)
    );

    const resizeTargets = new WeakMap<ResizeObserver, Set<Element>>();
    const NativeResizeObserver = window.ResizeObserver;
    class WorkspaceCountingResizeObserver extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        resizeTargets.set(this, new Set());
      }
      override observe(target: Element, options?: ResizeObserverOptions): void {
        super.observe(target, options);
        const targets = resizeTargets.get(this);
        if (targets && isWorkspaceNode(target) && !targets.has(target)) {
          targets.add(target);
          probe.resizeActive += 1;
        }
      }
      override unobserve(target: Element): void {
        if (resizeTargets.get(this)?.delete(target)) probe.resizeActive -= 1;
        super.unobserve(target);
      }
      override disconnect(): void {
        const targets = resizeTargets.get(this);
        if (targets) {
          probe.resizeActive -= targets.size;
          targets.clear();
        }
        super.disconnect();
      }
    }
    window.ResizeObserver = WorkspaceCountingResizeObserver;

    const mutationTargets = new WeakMap<MutationObserver, Set<Node>>();
    const NativeMutationObserver = window.MutationObserver;
    class WorkspaceCountingMutationObserver extends NativeMutationObserver {
      constructor(callback: MutationCallback) {
        super(callback);
        mutationTargets.set(this, new Set());
      }
      override observe(target: Node, options?: MutationObserverInit): void {
        super.observe(target, options);
        const targets = mutationTargets.get(this);
        if (targets && isWorkspaceNode(target) && !targets.has(target)) {
          targets.add(target);
          probe.mutationActive += 1;
        }
      }
      override disconnect(): void {
        const targets = mutationTargets.get(this);
        if (targets) {
          probe.mutationActive -= targets.size;
          targets.clear();
        }
        super.disconnect();
      }
    }
    window.MutationObserver = WorkspaceCountingMutationObserver;

    const listenerIds = new WeakMap<EventListenerOrEventListenerObject, number>();
    let listenerSequence = 0;
    const listenerKeys = new WeakMap<EventTarget, Set<string>>();
    const workspaceScrollers = new WeakSet<EventTarget>();
    const pagehideKeys = new Set<string>();
    const workspaceGlobalListenerKeys = new WeakMap<
      EventTarget,
      Map<string, WorkspaceGlobalListenerKind>
    >();
    const bumpWorkspaceGlobalListener = (kind: WorkspaceGlobalListenerKind, delta: number): void => {
      if (kind === 'pagehide') probe.pagehideActive += delta;
      else if (kind === 'hashchange') probe.windowHashchangeActive += delta;
      else if (kind === 'popstate') probe.windowPopstateActive += delta;
      else probe.documentClickCaptureActive += delta;
      probe.workspaceGlobalListenerActive += delta;
    };
    const workspaceGlobalListenerKind = (
      target: EventTarget,
      type: string,
      capture: boolean,
      stack: string,
    ): WorkspaceGlobalListenerKind | undefined => {
      if (!stack.includes('WorkspaceTabsPage')) return undefined;
      if (target === window && (type === 'pagehide' || type === 'hashchange' || type === 'popstate')) {
        return type;
      }
      if (target === document && type === 'click' && capture) return 'documentClick';
      return undefined;
    };
    const keyFor = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): string => {
      const capture = typeof options === 'boolean' ? options : options?.capture === true;
      let id = listenerIds.get(listener);
      if (id === undefined) {
        listenerSequence += 1;
        id = listenerSequence;
        listenerIds.set(listener, id);
      }
      return `${type}|${capture}|${id}`;
    };
    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      nativeAddEventListener.call(this, type, listener, options);
      if (!listener) return;
      const key = keyFor(type, listener, options);
      const capture = typeof options === 'boolean' ? options : options?.capture === true;
      if (isWorkspaceScroller(this)) {
        workspaceScrollers.add(this);
        let keys = listenerKeys.get(this);
        if (!keys) {
          keys = new Set();
          listenerKeys.set(this, keys);
        }
        if (!keys.has(key)) {
          keys.add(key);
          probe.scrollerListenerActive += 1;
        }
      }
      if (this === window && type === 'pagehide' && !pagehideKeys.has(key)) {
        pagehideKeys.add(key);
        probe.pagehideActive += 1;
      }
      const globalKind = workspaceGlobalListenerKind(this, type, capture, new Error().stack ?? '');
      if (globalKind) {
        let kinds = workspaceGlobalListenerKeys.get(this);
        if (!kinds) {
          kinds = new Map();
          workspaceGlobalListenerKeys.set(this, kinds);
        }
        if (!kinds.has(key)) {
          kinds.set(key, globalKind);
          // pagehide 已由既有 pagehideActive 计数；这里只累加 workspace 全局聚合。
          if (globalKind === 'pagehide') probe.workspaceGlobalListenerActive += 1;
          else bumpWorkspaceGlobalListener(globalKind, 1);
        }
      }
    };
    EventTarget.prototype.removeEventListener = function removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      nativeRemoveEventListener.call(this, type, listener, options);
      if (!listener) return;
      const key = keyFor(type, listener, options);
      if (workspaceScrollers.has(this) && listenerKeys.get(this)?.delete(key)) {
        probe.scrollerListenerActive -= 1;
      }
      if (this === window && type === 'pagehide' && pagehideKeys.delete(key)) {
        probe.pagehideActive -= 1;
      }
      const globalKind = workspaceGlobalListenerKeys.get(this)?.get(key);
      if (globalKind && workspaceGlobalListenerKeys.get(this)?.delete(key)) {
        if (globalKind === 'pagehide') probe.workspaceGlobalListenerActive -= 1;
        else bumpWorkspaceGlobalListener(globalKind, -1);
      }
    };

    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    const workspaceRafIds = new Set<number>();
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      if (probe.staleProbe) probe.staleRafScheduled += 1;
      const workspaceOwned = (new Error().stack ?? '').includes('WorkspaceTabsPage');
      if (workspaceOwned) probe.workspaceRafScheduled += 1;
      const id = nativeRequestAnimationFrame((timestamp) => {
        if (workspaceOwned && workspaceRafIds.delete(id)) probe.workspaceRafActive -= 1;
        callback(timestamp);
      });
      if (workspaceOwned) {
        workspaceRafIds.add(id);
        probe.workspaceRafActive += 1;
      }
      return id;
    };
    window.cancelAnimationFrame = (id: number): void => {
      if (workspaceRafIds.delete(id)) probe.workspaceRafActive -= 1;
      nativeCancelAnimationFrame(id);
    };
  });
}

async function readWorkspaceLifecycleProbe(page: Page): Promise<WorkspaceLifecycleProbe> {
  return page.evaluate(() => {
    const probe = (window as unknown as { __wsLifecycleProbe: WorkspaceLifecycleProbe }).__wsLifecycleProbe;
    return { ...probe };
  });
}

async function clickSidebarMenu(page: Page, name: RegExp): Promise<void> {
  const sidebar = page.getByRole('complementary', { name: 'Sidebar navigation', exact: true });
  await sidebar.getByRole('link', { name }).click();
}

async function enterWorkspaceViaMenu(page: Page): Promise<void> {
  await clickSidebarMenu(page, /Multi-tab Workspace|多标签工作台/);
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expect(workspaceRoot(page)).toBeVisible();
}

async function leaveWorkspaceViaMenu(page: Page): Promise<void> {
  await clickSidebarMenu(page, /Health Office|智能辅助办公/);
  await expect(page).toHaveURL(/#\/health_office/, { timeout: 20_000 });
  await expect(workspaceRoot(page)).toHaveCount(0);
}

test('pending workspace restore resources are scoped and cleared by a real menu leave', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  await installWorkspaceLifecycleProbe(page);

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  const baseline = await readWorkspaceLifecycleProbe(page);
  const pagehideBaseline = baseline.pagehideActive;
  await enterWorkspaceViaMenu(page);

  const accounts = pane(page, 'crm_accounts');
  await accounts.getByPlaceholder('Search...').fill('e');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect.poll(async () => {
    const envelope = await readPersistedQuery(page, 'crm_accounts') as { snapshot?: { search?: string } } | null;
    return envelope?.snapshot?.search;
  }).toBe('e');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  // 先在关闭期间保存可达的 68，再把视口放大使 68 不可达；切回时才是真实 pending。
  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await page.setViewportSize({ width: 1280, height: 500 });
  await expect.poll(async () => {
    const metrics = await scroller.evaluate(element => ({
      maxTop: element.scrollHeight - element.clientHeight,
    }));
    return captured > metrics.maxTop + 1;
  }).toBe(true);
  const beforePending = await readWorkspaceLifecycleProbe(page);
  await tab(page, /Customer Accounts|客户账户/).click();
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.workspaceRafActive),
    { message: 'pending restore must have an in-flight workspace rAF' },
  ).toBeGreaterThan(0);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.workspaceRafScheduled),
    { message: 'pending restore must schedule workspace rAF work' },
  ).toBeGreaterThan(beforePending.workspaceRafScheduled);

  // 让 60 帧有界窗口耗尽；此时观察者与旧监听仍必须存在，才能证明离开时真的清理。
  await page.waitForTimeout(1500);
  const pending = await readWorkspaceLifecycleProbe(page);
  expect(pending.resizeActive, 'pending restore must observe workspace sizes').toBeGreaterThan(0);
  expect(pending.mutationActive, 'pending restore must observe workspace mutations').toBeGreaterThan(0);
  expect(pending.scrollerListenerActive, 'pending restore must keep scroller listeners').toBeGreaterThanOrEqual(4);
  expect(
    pending.windowHashchangeActive,
    'workspace must add a window hashchange listener beyond the pre-entry baseline',
  ).toBeGreaterThan(baseline.windowHashchangeActive);
  expect(
    pending.windowPopstateActive,
    'workspace must add a window popstate listener beyond the pre-entry baseline',
  ).toBeGreaterThan(baseline.windowPopstateActive);
  expect(
    pending.documentClickCaptureActive,
    'workspace must add a document capture click listener beyond the pre-entry baseline',
  ).toBeGreaterThan(baseline.documentClickCaptureActive);
  expect(
    pending.workspaceGlobalListenerActive,
    'workspace global listeners must be positively observed while mounted',
  ).toBeGreaterThan(baseline.workspaceGlobalListenerActive);
  expect(
    await scroller.evaluate(element => element.scrollTop),
    'the unreachable position stays clamped while pending',
  ).toBe(await scroller.evaluate(element => element.scrollHeight - element.clientHeight));

  const documentId = pending.documentId;
  const staleScroller = await scroller.elementHandle();
  if (!staleScroller) throw new Error('workspace scroller is not available for stale probes');

  await leaveWorkspaceViaMenu(page);
  const afterLeave = await readWorkspaceLifecycleProbe(page);
  expect(afterLeave.documentId, 'the menu leave must stay in the same browser document').toBe(documentId);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.resizeActive),
  ).toBe(0);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.mutationActive),
  ).toBe(0);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.scrollerListenerActive),
  ).toBe(0);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.pagehideActive),
  ).toBe(pagehideBaseline);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.windowHashchangeActive),
  ).toBe(baseline.windowHashchangeActive);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.windowPopstateActive),
  ).toBe(baseline.windowPopstateActive);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.documentClickCaptureActive),
  ).toBe(baseline.documentClickCaptureActive);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.workspaceGlobalListenerActive),
  ).toBe(baseline.workspaceGlobalListenerActive);
  await expect.poll(
    () => readWorkspaceLifecycleProbe(page).then(probe => probe.workspaceRafActive),
  ).toBe(0);

  const beforeStale = await readWorkspaceLifecycleProbe(page);
  await staleScroller.evaluate(element => {
    const probe = (window as unknown as { __wsLifecycleProbe: WorkspaceLifecycleProbe }).__wsLifecycleProbe;
    probe.staleProbe = true;
    try {
      element.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      element.dispatchEvent(new Event('touchstart', { bubbles: true }));
      const poke = document.createElement('span');
      element.appendChild(poke);
      poke.remove();
    } finally {
      probe.staleProbe = false;
    }
  });
  await page.waitForTimeout(300);
  const afterStale = await readWorkspaceLifecycleProbe(page);
  expect(afterStale.staleRafScheduled, 'stale workspace DOM events must not schedule restore work').toBe(0);
  expect(afterStale.workspaceRafScheduled, 'stale workspace mutations must not schedule restore work').toBe(beforeStale.workspaceRafScheduled);
  expect(afterStale.resizeActive).toBe(0);
  expect(afterStale.mutationActive).toBe(0);
  expect(afterStale.scrollerListenerActive).toBe(0);
  expect(afterStale.pagehideActive).toBe(pagehideBaseline);
  expect(afterStale.windowHashchangeActive).toBe(baseline.windowHashchangeActive);
  expect(afterStale.windowPopstateActive).toBe(baseline.windowPopstateActive);
  expect(afterStale.documentClickCaptureActive).toBe(baseline.documentClickCaptureActive);
  expect(afterStale.workspaceGlobalListenerActive).toBe(baseline.workspaceGlobalListenerActive);

  // 恢复可达视口后由真实菜单返回，查询与位置都要恢复，且仍是同一 document。
  await page.setViewportSize({ width: 1280, height: 420 });
  await enterWorkspaceViaMenu(page);
  const reentered = pane(page, 'crm_accounts');
  await expect(reentered.getByPlaceholder('Search...')).toHaveValue('e');
  await expect.poll(
    () => page.locator('[data-workspace-scroll="crm_accounts"]').evaluate(element => element.scrollTop),
    { message: 're-entering the workspace must restore the saved position' },
  ).toBe(captured);
  const reenteredProbe = await readWorkspaceLifecycleProbe(page);
  expect(reenteredProbe.documentId).toBe(documentId);
  expect(reenteredProbe.windowHashchangeActive, 're-entry must not stack hashchange listeners').toBe(pending.windowHashchangeActive);
  expect(reenteredProbe.windowPopstateActive, 're-entry must not stack popstate listeners').toBe(pending.windowPopstateActive);
  expect(reenteredProbe.documentClickCaptureActive, 're-entry must not stack document click listeners').toBe(pending.documentClickCaptureActive);
  expect(reenteredProbe.workspaceGlobalListenerActive, 're-entry must not stack workspace global listeners').toBe(pending.workspaceGlobalListenerActive);

  expect(errors).toEqual([]);
});

test('real menu SPA round trip restores account query and scroll without reloading', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  await installWorkspaceLifecycleProbe(page);

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await enterWorkspaceViaMenu(page);

  const accounts = pane(page, 'crm_accounts');
  await accounts.getByPlaceholder('Search...').fill('e');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect.poll(async () => {
    const envelope = await readPersistedQuery(page, 'crm_accounts') as { snapshot?: { search?: string } } | null;
    return envelope?.snapshot?.search;
  }).toBe('e');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await scroller.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);
  const documentId = (await readWorkspaceLifecycleProbe(page)).documentId;

  await leaveWorkspaceViaMenu(page);
  expect((await readWorkspaceLifecycleProbe(page)).documentId).toBe(documentId);
  await enterWorkspaceViaMenu(page);
  expect((await readWorkspaceLifecycleProbe(page)).documentId, 'menu round trip must not create a new document').toBe(documentId);

  const reentered = pane(page, 'crm_accounts');
  await expect(reentered.getByPlaceholder('Search...')).toHaveValue('e');
  await expect.poll(
    () => page.locator('[data-workspace-scroll="crm_accounts"]').evaluate(element => element.scrollTop),
  ).toBe(captured);

  expect(errors).toEqual([]);
});
async function login(page: Page): Promise<void> {
  await page.goto('/#/login');
  const identifier = page.locator('#login-identifier');
  await identifier.waitFor({ state: 'visible', timeout: 20_000 });
  await identifier.fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: /Operations workspace|运营工作台/ })).toBeVisible({ timeout: 20_000 });
}

async function openWorkspace(page: Page, resource = 'crm_accounts'): Promise<void> {
  await page.goto(`/#/workspace?tab=${resource}`);
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-app-page="workspace-tabs"]')).toBeVisible();
}

async function useSmallPages(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '2'));
}

function pane(page: Page, resource: string) {
  return page.locator(`[data-workspace-pane="${resource}"]`);
}

function tab(page: Page, name: RegExp) {
  return page.getByRole('tab', { name });
}

async function closeTab(page: Page, name: RegExp): Promise<void> {
  await tab(page, name).locator('..').getByRole('button').click();
}

async function expectActiveTab(page: Page, name: RegExp): Promise<void> {
  await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
}

function requireBox<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`${label} is not measurable`);
  return value;
}

const TAB_STATE_STORAGE_PREFIX = 'svadmin:example-workspace-tab-state:v1:';

interface LayoutDelayController {
  set(delays: Record<string, number>): void;
  release(resource: string): Promise<void>;
}

/**
 * 测试专用受控布局夹具：真实 AutoTable 内容照常渲染，只把真实滚动
 * 容器的直接子内容临时 display:none，由测试在需要时显式 release。
 * 不在 HTML 加载时启动计时器，避免 Vite 冷启动或跨引擎时序先行移除样式。
 * 不伪造网络、Provider、宽高或滚动数据，因此不是真实网络/后端验收。
 */
async function installLayoutDelay(page: Page): Promise<LayoutDelayController> {
  const config: { delays: Record<string, number> } = { delays: {} };
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const html = await response.text();
    const active = Object.entries(config.delays).filter(([, delay]) => delay > 0);
    if (active.length === 0) {
      await route.fulfill({ response, body: html });
      return;
    }
    const styles = active
      .map(([resource]) => (
        `<style data-test-layout-delay="${resource}">[data-workspace-scroll="${resource}"] > *{display:none!important}</style>`
      ))
      .join('');
    await route.fulfill({
      response,
      body: html.replace('</head>', `${styles}</head>`),
      headers: { ...response.headers(), 'content-type': 'text/html; charset=utf-8' },
    });
  });
  return {
    set(delays) {
      config.delays = delays;
    },
    async release(resource) {
      await page.evaluate((name) => {
        for (const style of document.querySelectorAll('style[data-test-layout-delay]')) {
          if (style.getAttribute('data-test-layout-delay') === name) style.remove();
        }
      }, resource);
    },
  };
}

async function expectLayoutHidden(page: Page, resource: string): Promise<void> {
  await expect(page.locator(`style[data-test-layout-delay="${resource}"]`)).toHaveCount(1);
}

async function expectLayoutRevealed(page: Page, resource: string): Promise<void> {
  await expect(page.locator(`style[data-test-layout-delay="${resource}"]`)).toHaveCount(0, {
    timeout: 15_000,
  });
}

const RESTORE_FRAME_WINDOW = 60;

/** 在已挂载且确认 hidden 后等待真实 rAF 帧，越过恢复实现的有界重试窗口。 */
async function waitBeyondRestoreFrameWindow(page: Page): Promise<void> {
  await page.evaluate(async (frameCount) => {
    await new Promise<void>((resolve) => {
      let remaining = frameCount;
      const tick = (): void => {
        remaining -= 1;
        if (remaining <= 0) resolve();
        else window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
  }, RESTORE_FRAME_WINDOW + 1);
}

function tableContainer(scope: ReturnType<typeof pane>) {
  return scope.locator('[data-slot="table-container"]').first();
}

async function readPersistedQuery(page: Page, resource: string): Promise<unknown> {
  return page.evaluate(({ prefix, resourceName }) => {
    const marker = `:${encodeURIComponent(resourceName)}`;
    const key = Object.keys(sessionStorage).find(candidate => (
      candidate.startsWith(prefix) && candidate.endsWith(marker)
    ));
    if (!key) return null;
    try {
      const entry: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const query = (entry as Record<string, unknown>)['query'];
      if (typeof query !== 'string' || !query) return null;
      return JSON.parse(query);
    } catch {
      return null;
    }
  }, { prefix: TAB_STATE_STORAGE_PREFIX, resourceName: resource });
}

async function installPersistedQueryOnNextLoad(page: Page, resource: string, snapshot: unknown): Promise<void> {
  await page.addInitScript(({ prefix, resourceName, listSnapshot }) => {
    const marker = `:${encodeURIComponent(resourceName)}`;
    const key = Object.keys(sessionStorage).find(candidate => (
      candidate.startsWith(prefix) && candidate.endsWith(marker)
    ));
    if (!key) return;
    try {
      const entry: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const record = entry as Record<string, unknown>;
      record['query'] = JSON.stringify({
        version: 1,
        resource: resourceName,
        path: `/workspace?tab=${resourceName}`,
        snapshot: listSnapshot,
      });
      sessionStorage.setItem(key, JSON.stringify(record));
    } catch { /* ignore invalid test fixture */ }
  }, { prefix: TAB_STATE_STORAGE_PREFIX, resourceName: resource, listSnapshot: snapshot });
}

let scrollInjectionNonce = 0;

async function installPersistedScrollOnNextLoad(page: Page, tabId: string, scrollTop: number): Promise<void> {
  // 每次调用使用新的 nonce：只在下一次导航生效，后续重新加载不会再把旧值写回。
  const nonce = `${Date.now()}-${++scrollInjectionNonce}`;
  await page.addInitScript(({ prefix, id, top, marker }) => {
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, '1');
    } catch {
      return;
    }
    const suffix = `:${encodeURIComponent(id)}`;
    const key = Object.keys(sessionStorage).find(candidate => (
      candidate.startsWith(prefix) && candidate.endsWith(suffix)
    ));
    if (!key) return;
    try {
      const entry: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const record = entry as Record<string, unknown>;
      record['scrollTop'] = top;
      record['scrollLeft'] = 0;
      sessionStorage.setItem(key, JSON.stringify(record));
    } catch { /* ignore invalid test fixture */ }
  }, {
    prefix: TAB_STATE_STORAGE_PREFIX,
    id: tabId,
    top: scrollTop,
    marker: `svadmin:test-scroll-injection:${nonce}`,
  });
}

async function currentPageLabel(scope: ReturnType<typeof pane>): Promise<string> {
  return scope.locator('[data-slot="pagination-link"][aria-current="page"]').innerText();
}

test('account search and page are persisted as a real snapshot and restored after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await useSmallPages(page);
  await openWorkspace(page, 'crm_accounts');

  const accounts = pane(page, 'crm_accounts');
  const search = accounts.getByPlaceholder('Search...');
  await search.fill('e');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect(accounts.getByText('Lumen Clinics').first()).toBeVisible();
  await expect.poll(async () => {
    const envelope = await readPersistedQuery(page, 'crm_accounts') as { snapshot?: { search?: string } } | null;
    return envelope?.snapshot?.search;
  }).toBe('e');
  await accounts.getByRole('button', { name: 'Go to next page' }).click();
  await expect(accounts.getByText('Summit Field Services').first()).toBeVisible();
  await expect(accounts.getByText('Helio Manufacturing')).toHaveCount(0);

  await expect.poll(() => readPersistedQuery(page, 'crm_accounts')).toMatchObject({
    version: 1,
    resource: 'crm_accounts',
    path: '/workspace?tab=crm_accounts',
    snapshot: {
      search: 'e',
      filters: [],
      sorters: [{ field: 'accountName', order: 'asc' }],
      pagination: { current: 2, pageSize: 2 },
    },
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  const reloaded = pane(page, 'crm_accounts');
  await expect(reloaded.getByPlaceholder('Search...')).toHaveValue('e');
  await expect.poll(() => currentPageLabel(reloaded)).toBe('2');
  await expect(reloaded.getByText('Summit Field Services').first()).toBeVisible();
  await expect(reloaded.getByText('Helio Manufacturing')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('reload restores active deal filters and keeps non-active account query isolated', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await useSmallPages(page);
  await openWorkspace(page, 'crm_accounts');

  const accounts = pane(page, 'crm_accounts');
  await accounts.getByPlaceholder('Search...').fill('e');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect.poll(async () => {
    const envelope = await readPersistedQuery(page, 'crm_accounts') as { snapshot?: { search?: string } } | null;
    return envelope?.snapshot?.search;
  }).toBe('e');
  await accounts.getByRole('button', { name: 'Go to next page' }).click();
  await expect(accounts.getByText('Summit Field Services').first()).toBeVisible();

  // 切换会创建两个标签的适配器快照；筛选由真实持久化 envelope 注入，
  // 因为当前 example 的 crm_deals 字段没有启用 AutoTable 的列筛选 UI。
  await tab(page, /Revenue Opportunities|收入机会/).click();
  await tab(page, /Customer Accounts|客户账户/).click();
  await tab(page, /Revenue Opportunities|收入机会/).click();
  const deals = pane(page, 'crm_deals');
  await deals.getByPlaceholder('Search...').fill('Summit');
  await expect(deals.getByText('Summit dispatch upgrade').first()).toBeVisible();
  await installPersistedQueryOnNextLoad(page, 'crm_deals', {
    search: 'Summit',
    filters: [{ field: 'stage', operator: 'eq', value: 'discovery' }],
    sorters: [{ field: 'closeDate', order: 'asc' }],
    pagination: { current: 1, pageSize: 2 },
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  const reloadedDeals = pane(page, 'crm_deals');
  await expect(reloadedDeals.getByPlaceholder('Search...')).toHaveValue('Summit');
  await expect(reloadedDeals.getByText('Stage: discovery')).toBeVisible();
  await expect(reloadedDeals.getByText('Summit dispatch upgrade').first()).toBeVisible();
  await expect(reloadedDeals.getByText('Helio multi-site launch')).toHaveCount(0);
  await expect(reloadedDeals.getByText('Lumen renewal recovery')).toHaveCount(0);

  await tab(page, /Customer Accounts|客户账户/).click();
  const reloadedAccounts = pane(page, 'crm_accounts');
  await expect(reloadedAccounts.getByPlaceholder('Search...')).toHaveValue('e');
  await expect.poll(() => currentPageLabel(reloadedAccounts)).toBe('2');
  await expect(reloadedAccounts.getByText('Summit Field Services').first()).toBeVisible();
  await expect(reloadedAccounts.getByText('Stage: discovery')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('reopening a closed account tab starts from an empty query', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await useSmallPages(page);
  await openWorkspace(page, 'crm_accounts');

  await pane(page, 'crm_accounts').getByPlaceholder('Search...').fill('Helio');
  await expect(pane(page, 'crm_accounts').getByText('Helio Manufacturing').first()).toBeVisible();
  await expect(pane(page, 'crm_accounts').getByText('Lumen Clinics')).toHaveCount(0);

  await closeTab(page, /Customer Accounts|客户账户/);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await page.locator('[data-open-workspace-resource="crm_accounts"]').click();
  await expectActiveTab(page, /Customer Accounts|客户账户/);

  const reopened = pane(page, 'crm_accounts');
  await expect(reopened.getByPlaceholder('Search...')).toHaveValue('');
  await expect.poll(() => currentPageLabel(reopened)).toBe('1');
  await expect(reopened.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect(reopened.getByText('Lumen Clinics').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('existing resources keep independent AutoTable search and page state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await useSmallPages(page);
  await openWorkspace(page, 'crm_accounts');

  const accounts = pane(page, 'crm_accounts');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect(accounts.getByText('Lumen Clinics').first()).toBeVisible();
  await accounts.getByRole('button', { name: 'Go to next page' }).click();
  await expect(accounts.getByText('Summit Field Services').first()).toBeVisible();
  await expect(accounts.getByText('Helio Manufacturing')).toHaveCount(0);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  const deals = pane(page, 'crm_deals');
  await expect(deals.getByText('Helio multi-site launch').first()).toBeVisible();
  await deals.getByPlaceholder('Search...').fill('Summit');
  await expect(deals.getByText('Summit dispatch upgrade').first()).toBeVisible();
  await expect(deals.getByText('Helio multi-site launch')).toHaveCount(0);

  await tab(page, /Customer Accounts|客户账户/).click();
  await expect(accounts.getByText('Summit Field Services').first()).toBeVisible();
  await expect(accounts.getByPlaceholder('Search...')).toHaveValue('');

  await accounts.getByPlaceholder('Search...').fill('Helio');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect(accounts.getByText('Summit Field Services')).toHaveCount(0);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expect(deals.getByPlaceholder('Search...')).toHaveValue('Summit');
  await expect(deals.getByText('Summit dispatch upgrade').first()).toBeVisible();
  await expect(deals.getByText('Helio multi-site launch')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('browser history keeps the active workspace tab aligned with the URL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await expectActiveTab(page, /Customer Accounts|客户账户/);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect(pane(page, 'crm_deals')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_deals');

  await page.goBack();
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  await expect(pane(page, 'crm_accounts')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_accounts');

  await page.goForward();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect(pane(page, 'crm_deals')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_deals');

  expect(errors).toEqual([]);
});

test('closing and eviction clear only their tab while reload restores allowed state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_deals');

  const deals = pane(page, 'crm_deals');
  await deals.getByPlaceholder('Search...').fill('Summit');
  await expect(deals.getByText('Summit dispatch upgrade').first()).toBeVisible();

  await page.locator('[data-open-workspace-resource="crm_activities"]').click();
  await expectActiveTab(page, /Customer Activities|客户活动/);
  const activities = pane(page, 'crm_activities');
  await activities.getByPlaceholder('Search...').fill('Lumen');
  await expect(activities.getByText('Lumen renewal checkpoint').first()).toBeVisible();

  await page.locator('[data-open-workspace-resource="crm_contacts"]').click();
  await expectActiveTab(page, /Customer Contacts|客户联系人/);
  await expect(tab(page, /Customer Accounts|客户账户/)).toHaveCount(0);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expect(deals.getByPlaceholder('Search...')).toHaveValue('Summit');
  await expect(deals.getByText('Summit dispatch upgrade').first()).toBeVisible();

  await tab(page, /Customer Contacts|客户联系人/).click();
  await closeTab(page, /Customer Contacts|客户联系人/);
  await expectActiveTab(page, /Customer Activities|客户活动/);
  await expect(activities.getByPlaceholder('Search...')).toHaveValue('Lumen');

  await closeTab(page, /Customer Activities|客户活动/);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect(deals.getByPlaceholder('Search...')).toHaveValue('Summit');

  await page.locator('[data-open-workspace-resource="crm_activities"]').click();
  await expectActiveTab(page, /Customer Activities|客户活动/);
  await expect(pane(page, 'crm_activities').getByPlaceholder('Search...')).toHaveValue('');
  await closeTab(page, /Customer Activities|客户活动/);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expect(tab(page, /Customer Accounts|客户账户/)).toHaveCount(0);
  await expect(tab(page, /Revenue Opportunities|收入机会/)).toHaveCount(1);
  await expect(tab(page, /Customer Activities|客户活动/)).toHaveCount(0);
  await expect(tab(page, /Customer Contacts|客户联系人/)).toHaveCount(0);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_deals');

  expect(errors).toEqual([]);
});

test('same-session windows synchronize tab collection without sharing list state', async ({ page }) => {
  const peer = await page.context().newPage();
  const errors: string[] = [];
  const peerErrors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  peer.on('pageerror', error => peerErrors.push(error.message));

  try {
    await isolateNonBusinessFontStylesheet(peer);
    await login(page);
    await openWorkspace(page, 'crm_accounts');
    await openWorkspace(peer, 'crm_accounts');

    const peerDeals = pane(peer, 'crm_deals');
    await tab(peer, /Revenue Opportunities|收入机会/).click();
    await peerDeals.getByPlaceholder('Search...').fill('Summit');
    await expect(peerDeals.getByText('Summit dispatch upgrade').first()).toBeVisible();

    await tab(page, /Revenue Opportunities|收入机会/).click();
    await expectActiveTab(page, /Revenue Opportunities|收入机会/);
    await page.locator('[data-open-workspace-resource="crm_activities"]').click();
    await expectActiveTab(page, /Customer Activities|客户活动/);
    await expect(tab(peer, /Customer Activities|客户活动/)).toHaveCount(1);

    await page.locator('[data-open-workspace-resource="crm_contacts"]').click();
    await expectActiveTab(page, /Customer Contacts|客户联系人/);
    await expect(tab(page, /Customer Accounts|客户账户/)).toHaveCount(0);
    await expect(tab(peer, /Customer Accounts|客户账户/)).toHaveCount(0);
    await expect(tab(peer, /Customer Contacts|客户联系人/)).toHaveCount(1);
    await expect(peerDeals.getByPlaceholder('Search...')).toHaveValue('Summit');
    await expect(peerDeals.getByText('Summit dispatch upgrade').first()).toBeVisible();

    await closeTab(page, /Customer Contacts|客户联系人/);
    await expect(tab(peer, /Customer Contacts|客户联系人/)).toHaveCount(0);
    await expect(tab(peer, /Revenue Opportunities|收入机会/)).toHaveCount(1);
    await expect(peerDeals.getByPlaceholder('Search...')).toHaveValue('Summit');

    expect(errors).toEqual([]);
    expect(peerErrors).toEqual([]);
  } finally {
    await peer.close();
  }
});

test('closing a default tab keeps it absent after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await expectActiveTab(page, /Customer Accounts|客户账户/);

  await closeTab(page, /Customer Accounts|客户账户/);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect(tab(page, /Customer Accounts|客户账户/)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_deals');

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expect(tab(page, /Customer Accounts|客户账户/)).toHaveCount(0);
  await expect(tab(page, /Revenue Opportunities|收入机会/)).toHaveCount(1);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);

  expect(errors).toEqual([]);
});

test('closing the last tab via X clears the URL and stays empty after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');

  await closeTab(page, /Revenue Opportunities|收入机会/);
  await closeTab(page, /Customer Accounts|客户账户/);

  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.locator('[data-workspace-empty="true"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('tab=');

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.locator('[data-workspace-empty="true"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('tab=');

  await page.locator('[data-open-workspace-resource="crm_contacts"]').click();
  await expectActiveTab(page, /Customer Contacts|客户联系人/);
  await expect(pane(page, 'crm_contacts')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_contacts');

  expect(errors).toEqual([]);
});

test('browser back to a closed tab URL keeps the empty workspace and does not reopen tabs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await expectActiveTab(page, /Customer Accounts|客户账户/);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_deals');

  await closeTab(page, /Revenue Opportunities|收入机会/);
  await closeTab(page, /Customer Accounts|客户账户/);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.locator('[data-workspace-empty="true"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('tab=');

  // 浏览器后退带回旧 tab URL 时，空态工作区只能把 URL replace 回无 tab，不能复活标签。
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('tab=');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.locator('[data-workspace-empty="true"]')).toBeVisible();
  await expect(pane(page, 'crm_accounts')).toHaveCount(0);

  // 只有用户主动打开资源时才新建标签并 push 对应 URL。
  await page.locator('[data-open-workspace-resource="crm_contacts"]').click();
  await expectActiveTab(page, /Customer Contacts|客户联系人/);
  await expect(pane(page, 'crm_contacts')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tab=crm_contacts');

  expect(errors).toEqual([]);
});

test('scroll position is captured before hiding and restored on return', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();

  const metrics = await scroller.evaluate(element => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  test.skip(metrics.scrollHeight <= metrics.clientHeight, 'No real vertical scrollbar in this viewport; scroll restoration is not observable.');

  await scroller.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await tab(page, /Customer Accounts|客户账户/).click();
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(captured);

  expect(errors).toEqual([]);
});

test('narrow 390px viewport keeps heading, actions and tablist inside the viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await openWorkspace(page, 'crm_accounts');

  const activePane = pane(page, 'crm_accounts');
  const heading = page.getByRole('heading', {
    name: /Operations multi-tab workspace|运营多标签工作区/,
    level: 1,
  });
  await expect(heading).toBeVisible();
  // 窄屏 AutoTable 使用卡片视图，表格行仍留在 DOM 中但不可见。
  await expect(activePane.getByText('Helio Manufacturing').filter({ visible: true }).first()).toBeVisible();

  // 逐元素测量边界，而不是只断言 document.scrollWidth：body overflow 隐藏会让后者假通过。
  const layout = await page.evaluate(() => {
    const measure = (element: Element | null, label: string) => {
      if (!element) throw new Error(`missing ${label} element`);
      const rect = element.getBoundingClientRect();
      const html = element as HTMLElement;
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        scrollWidth: html.scrollWidth,
        clientWidth: html.clientWidth,
      };
    };
    const root = document.querySelector('[data-app-page="workspace-tabs"]');
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      root: measure(root, 'workspace root'),
      shell: measure(root?.querySelector('[data-svadmin-content-page]') ?? null, 'content page shell'),
      header: measure(root?.querySelector('[data-svadmin-content-header]') ?? null, 'content page header'),
      heading: measure(root?.querySelector('h1') ?? null, 'page heading'),
      toolbar: measure(root?.querySelector('.workspace-tabs__toolbar') ?? null, 'workspace toolbar'),
      tablist: measure(root?.querySelector('[role="tablist"]') ?? null, 'tablist'),
      panes: measure(root?.querySelector('.workspace-tabs__panes') ?? null, 'workspace panes'),
      paneScroll: measure(root?.querySelector('[data-workspace-scroll="crm_accounts"]') ?? null, 'pane scroller'),
    };
  });

  const measured = ['root', 'shell', 'header', 'heading', 'toolbar', 'tablist', 'panes', 'paneScroll'] as const;
  for (const key of measured) {
    const box = layout[key];
    expect(box.left, `${key} left edge`).toBeGreaterThanOrEqual(-0.5);
    expect(box.right, `${key} right edge`).toBeLessThanOrEqual(layout.viewportWidth + 0.5);
  }

  // 隐式 grid 的 min-content 曾把 ContentPageShell 撑到 389.8px（root 仅 358px）。
  expect(layout.shell.width).toBeLessThanOrEqual(layout.root.width + 0.5);
  expect(layout.root.scrollWidth).toBeLessThanOrEqual(layout.root.clientWidth + 1);
  // 标题必须自行换行并完整落在自身盒内，不能靠 overflow 裁剪。
  expect(layout.heading.scrollWidth).toBeLessThanOrEqual(layout.heading.clientWidth + 1);
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

  for (const name of ['Export', 'Create']) {
    const button = activePane.getByRole('button', { name, exact: true });
    await expect(button, `${name} should be visible`).toBeVisible();
    const box = requireBox(await button.boundingBox(), `${name} button`);
    expect(box.x, `${name} left edge`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${name} right edge`).toBeLessThanOrEqual(layout.viewportWidth + 0.5);
  }

  // tablist 允许内部水平滚动，但滚动前后容器本身都不能超出视口。
  const tablist = page.locator('[role="tablist"]');
  await expect(tablist.getByRole('tab').first()).toBeVisible();
  if (await tablist.evaluate(el => el.scrollWidth > el.clientWidth)) {
    await tablist.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await expect.poll(() => tablist.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  }
  const tablistBox = requireBox(await tablist.boundingBox(), 'tablist');
  expect(tablistBox.x).toBeGreaterThanOrEqual(-0.5);
  expect(tablistBox.x + tablistBox.width).toBeLessThanOrEqual(layout.viewportWidth + 0.5);

  // 空态圆角不超过 8px。
  await closeTab(page, /Customer Accounts|客户账户/);
  await closeTab(page, /Revenue Opportunities|收入机会/);
  const empty = page.locator('[data-workspace-empty="true"]');
  await expect(empty).toBeVisible();
  const emptyRadius = await empty.evaluate(element => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
  expect(emptyRadius).toBeLessThanOrEqual(8.5);
  const emptyBox = requireBox(await empty.boundingBox(), 'empty state');
  expect(emptyBox.x + emptyBox.width).toBeLessThanOrEqual(layout.viewportWidth + 0.5);

  expect(errors).toEqual([]);
});

test('reload restores the active tab scroll and reopening after close starts at zero', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();

  const metrics = await scroller.evaluate(element => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  test.skip(metrics.scrollHeight <= metrics.clientHeight, 'No real vertical scrollbar in this viewport; reload scroll restoration is not observable.');

  await scroller.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, /Customer Accounts|客户账户/);

  const reloaded = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => reloaded.evaluate(element => element.scrollTop), {
    timeout: 10_000,
    message: 'active tab scroll should be restored after reload',
  }).toBe(captured);

  // 关闭后再打开同一资源，适配器应已清理自身快照，新的滚动位置从 0 开始。
  await closeTab(page, /Customer Accounts|客户账户/);
  await page.locator('[data-open-workspace-resource="crm_accounts"]').click();
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  const reopened = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(reopened.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect.poll(() => reopened.evaluate(element => element.scrollTop)).toBe(0);

  expect(errors).toEqual([]);
});

test('slow consumer layout beyond 60 frames restores scroll and closing cancels pending work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  const layoutDelay = await installLayoutDelay(page);

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  // 受控夹具只隐藏真实 AutoTable 内容，超过旧实现约 60 帧的重试窗口后再显示。
  layoutDelay.set({ crm_accounts: 3000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectLayoutHidden(page, 'crm_accounts');
  const reloaded = page.locator('[data-workspace-scroll="crm_accounts"]');
  const hidden = await reloaded.evaluate(element => {
    const table = element.querySelector('[data-slot="table-container"]');
    return {
      clientWidth: element.clientWidth,
      tableHeight: table ? table.getBoundingClientRect().height : -1,
    };
  });
  expect(hidden.tableHeight).toBe(0);
  await waitBeyondRestoreFrameWindow(page);
  await layoutDelay.release('crm_accounts');
  await expectLayoutRevealed(page, 'crm_accounts');
  await expect.poll(() => reloaded.evaluate(element => element.scrollTop), {
    timeout: 10_000,
    message: 'slow mounted content should restore after the old 60-frame window',
  }).toBe(captured);
  const revealed = await reloaded.evaluate(element => {
    const table = element.querySelector('[data-slot="table-container"]');
    return {
      clientWidth: element.clientWidth,
      tableHeight: table ? table.getBoundingClientRect().height : -1,
    };
  });
  // 恢复由真实内部内容 resize 驱动，而不是外壳宽度变化。
  expect(revealed.tableHeight).toBeGreaterThan(0);
  expect(revealed.clientWidth).toBe(hidden.clientWidth);

  // 关闭仍在慢加载的标签：恢复监听和尺寸观察都必须取消。
  layoutDelay.set({ crm_accounts: 2500 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectLayoutHidden(page, 'crm_accounts');
  await closeTab(page, /Customer Accounts|客户账户/);
  await expect(tab(page, /Customer Accounts|客户账户/)).toHaveCount(0);
  await layoutDelay.release('crm_accounts');
  await page.waitForTimeout(3000);
  await expect(page.locator('[data-workspace-scroll="crm_accounts"]')).toHaveCount(0);
  expect(errors).toEqual([]);

  // 卸载路径：重新打开慢加载标签后离开工作区，迟到内容不得触发页面错误。
  layoutDelay.set({ crm_accounts: 5000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-open-workspace-resource="crm_accounts"]').click();
  await expectLayoutHidden(page, 'crm_accounts');
  await page.goto('/#/dashboard');
  await layoutDelay.release('crm_accounts');
  await page.waitForTimeout(5200);
  expect(errors).toEqual([]);
});

test('non-active tab reloaded with slow layout restores when switched back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  const layoutDelay = await installLayoutDelay(page);

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  layoutDelay.set({ crm_accounts: 3000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);

  // 非活动标签内容仍在延迟挂载时切回，恢复必须等真实尺寸出现后再完成。
  await tab(page, /Customer Accounts|客户账户/).click();
  await expectLayoutHidden(page, 'crm_accounts');
  await layoutDelay.release('crm_accounts');
  await expectLayoutRevealed(page, 'crm_accounts');
  const restored = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => restored.evaluate(element => element.scrollTop), {
    timeout: 10_000,
    message: 'non-active tab should restore after its delayed layout mounts',
  }).toBe(captured);

  expect(errors).toEqual([]);
});

test('horizontal scroll owned by the table container restores after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 800, height: 640 });

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  const accounts = pane(page, 'crm_accounts');
  await expect(accounts.getByText('Helio Manufacturing').first()).toBeVisible();
  const table = tableContainer(accounts);
  await expect.poll(() => table.evaluate(element => element.scrollWidth > element.clientWidth + 1)).toBe(true);
  await table.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  const captured = await table.evaluate(element => element.scrollLeft);
  expect(captured).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  const restored = tableContainer(accounts);
  await expect.poll(() => restored.evaluate(element => element.scrollLeft), {
    message: 'the real horizontal owner must restore, not the outer vertical scroller',
  }).toBe(captured);
  await expect.poll(() => page.locator('[data-workspace-scroll="crm_accounts"]').evaluate(element => element.scrollLeft)).toBe(0);

  expect(errors).toEqual([]);
});

test('workspace survives unavailable sessionStorage and still restores within the session', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('sessionStorage blocked for test', 'SecurityError');
      },
    });
  });

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await tab(page, /Customer Accounts|客户账户/).click();
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(captured);

  expect(errors).toEqual([]);
});

test('user wheel scroll cancels a late restore that is still retrying', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  // 放大视口后内容区最大 scrollTop 变小，旧快照暂时不可达，恢复会持续重试。
  await page.setViewportSize({ width: 1280, height: 500 });
  await installPersistedScrollOnNextLoad(page, 'crm_accounts', captured);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  const restored = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => restored.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const maxTop = await restored.evaluate(element => element.scrollHeight - element.clientHeight);
  expect(captured).toBeGreaterThan(maxTop + 1);

  await restored.hover();
  await page.mouse.wheel(0, -10_000);
  await page.waitForTimeout(500);
  expect(await restored.evaluate(element => element.scrollTop), 'user scroll must win over the late restore').toBe(0);

  expect(errors).toEqual([]);
});

test('cancelled late restore does not resurrect the old position after switching and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  // 放大视口后最大 scrollTop 变小，旧快照不可达，恢复会持续重试。
  await page.setViewportSize({ width: 1280, height: 500 });
  await installPersistedScrollOnNextLoad(page, 'crm_accounts', captured);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  const restored = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => restored.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const maxTop = await restored.evaluate(element => element.scrollHeight - element.clientHeight);
  expect(captured).toBeGreaterThan(maxTop + 1);

  // 用户取消迟到恢复：滚回顶部后应采集当前位置，而不是继续保留不可达旧快照。
  await restored.hover();
  await page.mouse.wheel(0, -10_000);
  await expect.poll(() => restored.evaluate(element => element.scrollTop)).toBe(0);
  await page.waitForTimeout(200);

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await tab(page, /Customer Accounts|客户账户/).click();
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  await expect.poll(
    () => restored.evaluate(element => element.scrollTop),
    { message: 'cancelled restore must not bring back the unreachable old position' },
  ).toBe(0);

  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, /Customer Accounts|客户账户/);
  const reloaded = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(reloaded.getByText('Helio Manufacturing').first()).toBeVisible();
  await expect.poll(
    () => reloaded.evaluate(element => element.scrollTop),
    { message: 'the cancelled position must persist as the new snapshot' },
  ).toBe(0);

  expect(errors).toEqual([]);
});

interface WorkspaceRestoreProbe {
  observe: number;
  unobserve: number;
  disconnect: number;
  raf: number;
}

test('pending unreachable restore stops observing and scheduling after the bounded window', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  const layoutDelay = await installLayoutDelay(page);

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  await page.addInitScript(() => {
    const state: WorkspaceRestoreProbe = { observe: 0, unobserve: 0, disconnect: 0, raf: 0 };
    Object.defineProperty(window, '__wsRestoreProbe', { value: state, configurable: true });
    const NativeResizeObserver = window.ResizeObserver;
    class CountingResizeObserver extends NativeResizeObserver {
      override observe(target: Element, options?: ResizeObserverOptions): void {
        state.observe += 1;
        super.observe(target, options);
      }
      override unobserve(target: Element): void {
        state.unobserve += 1;
        super.unobserve(target);
      }
      override disconnect(): void {
        state.disconnect += 1;
        super.disconnect();
      }
    }
    window.ResizeObserver = CountingResizeObserver;
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      state.raf += 1;
      return nativeRaf(callback);
    };
  });

  await page.setViewportSize({ width: 1280, height: 500 });
  await installPersistedScrollOnNextLoad(page, 'crm_accounts', captured);
  layoutDelay.set({ crm_accounts: 3000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectLayoutHidden(page, 'crm_accounts');
  await waitBeyondRestoreFrameWindow(page);
  await layoutDelay.release('crm_accounts');
  await expectLayoutRevealed(page, 'crm_accounts');
  const restored = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => restored.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const maxTop = await restored.evaluate(element => element.scrollHeight - element.clientHeight);
  expect(captured).toBeGreaterThan(maxTop + 1);

  // 等待超过 60 帧的有界窗口并让静止页面稳定，再确认没有持续 observe/rAF。
  await page.waitForTimeout(1500);
  const before = await page.evaluate(
    () => (window as unknown as { __wsRestoreProbe: WorkspaceRestoreProbe }).__wsRestoreProbe,
  );
  await page.waitForTimeout(1500);
  const after = await page.evaluate(
    () => (window as unknown as { __wsRestoreProbe: WorkspaceRestoreProbe }).__wsRestoreProbe,
  );
  expect(after.observe).toBe(before.observe);
  expect(after.unobserve).toBe(before.unobserve);
  expect(after.disconnect).toBe(before.disconnect);
  expect(after.raf, 'a static page must not keep polling the unreachable position').toBe(before.raf);
  expect(await restored.evaluate(element => element.scrollTop)).toBe(maxTop);

  expect(errors).toEqual([]);
});

test('only scroll intent keys and scrollbar pointer drag cancel a pending restore', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 420 });
  const layoutDelay = await installLayoutDelay(page);

  await login(page);
  await page.evaluate(() => localStorage.setItem('svadmin-default-page-size', '20'));
  await openWorkspace(page, 'crm_accounts');
  const scroller = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect(scroller.getByText('Helio Manufacturing').first()).toBeVisible();
  await scroller.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const captured = await scroller.evaluate(element => element.scrollTop);

  await page.setViewportSize({ width: 1280, height: 500 });
  await installPersistedScrollOnNextLoad(page, 'crm_accounts', captured);
  layoutDelay.set({ crm_accounts: 6000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectLayoutHidden(page, 'crm_accounts');
  await waitBeyondRestoreFrameWindow(page);
  await layoutDelay.release('crm_accounts');
  await expectLayoutRevealed(page, 'crm_accounts');
  const restored = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => restored.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const maxTop = await restored.evaluate(element => element.scrollHeight - element.clientHeight);
  expect(captured).toBeGreaterThan(maxTop + 1);

  // 普通按键（不是滚动意图）不能取消迟到恢复。
  await restored.evaluate(element => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    element.scrollTop = 0;
    // 用真实子树变更触发待定恢复重新尝试，不引入公开测试钩子。
    const poke = document.createElement('span');
    element.appendChild(poke);
    poke.remove();
  });
  await page.waitForTimeout(300);
  expect(await restored.evaluate(element => element.scrollTop)).toBe(maxTop);

  // 滚动按键取消后，迟到的恢复不会再把位置拉回不可达旧快照。
  await restored.evaluate(element => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    element.scrollTop = 0;
    const poke = document.createElement('span');
    element.appendChild(poke);
    poke.remove();
  });
  await page.waitForTimeout(300);
  expect(await restored.evaluate(element => element.scrollTop)).toBe(0);

  // 滚动条 pointer 拖动同样取消；重新制造不可达 pending 恢复后再验证。
  await installPersistedScrollOnNextLoad(page, 'crm_accounts', captured);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectLayoutHidden(page, 'crm_accounts');
  await waitBeyondRestoreFrameWindow(page);
  await layoutDelay.release('crm_accounts');
  await expectLayoutRevealed(page, 'crm_accounts');
  const pendingPointer = page.locator('[data-workspace-scroll="crm_accounts"]');
  await expect.poll(() => pendingPointer.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await pendingPointer.evaluate(element => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    element.scrollTop = 0;
    const poke = document.createElement('span');
    element.appendChild(poke);
    poke.remove();
  });
  await page.waitForTimeout(300);
  expect(await pendingPointer.evaluate(element => element.scrollTop)).toBe(0);

  expect(errors).toEqual([]);
});

const EDITOR_TAB_ID = 'edit:crm_accounts:1';
const EDITOR_TAB_NAME = /Edit Customer Accounts|编辑客户账户/;

function editorPane(page: Page) {
  return page.locator('[data-workspace-editor="crm_accounts"]');
}

function accountNameInput(page: Page) {
  return editorPane(page).locator(
    '[data-svadmin-form-field][data-svadmin-field-key="accountName"] input',
  );
}

function ownerField(page: Page) {
  return editorPane(page).locator('[data-svadmin-form-field][data-svadmin-field-key="ownerId"]');
}

function workspaceRoot(page: Page) {
  return page.locator('[data-app-page="workspace-tabs"]');
}

async function persistedTabStateKey(page: Page, tabId: string): Promise<string | null> {
  return page.evaluate(({ prefix, id }) => {
    const suffix = `:${encodeURIComponent(id)}`;
    return Object.keys(sessionStorage).find(candidate => (
      candidate.startsWith(prefix) && candidate.endsWith(suffix)
    )) ?? null;
  }, { prefix: TAB_STATE_STORAGE_PREFIX, id: tabId });
}

test('real editor tab protects a dirty close, keeps the draft on cancel, then clears after save', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await page.locator('[data-open-workspace-editor="crm_accounts"]').click();

  await expectActiveTab(page, EDITOR_TAB_NAME);
  const editor = editorPane(page);
  await expect(editor).toBeVisible();
  const input = accountNameInput(page);
  await expect(input).toHaveValue('Helio Manufacturing');

  await input.fill('Helio Manufacturing Draft');
  await expect(workspaceRoot(page)).toHaveAttribute(
    'data-workspace-dirty-tabs',
    new RegExp(EDITOR_TAB_ID),
  );
  await expect(editor.getByText(/Unsaved|未保存/)).toBeVisible();

  await closeTab(page, EDITOR_TAB_NAME);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/unsaved changes|未保存的修改/);
  await expect(tab(page, EDITOR_TAB_NAME)).toBeVisible();
  await expectActiveTab(page, EDITOR_TAB_NAME);

  await dialog.getByRole('button', { name: /Cancel|取消/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(tab(page, EDITOR_TAB_NAME)).toBeVisible();
  await expect(input).toHaveValue('Helio Manufacturing Draft');

  // 切走再回来仍保留真实未保存草稿，并让适配器写入该标签的会话快照。
  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await tab(page, EDITOR_TAB_NAME).click();
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(input).toHaveValue('Helio Manufacturing Draft');
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).not.toBeNull();

  await editor.getByRole('button', { name: /Save|保存/ }).click();
  await expect.poll(() => workspaceRoot(page).getAttribute('data-workspace-dirty-tabs')).toBe('');
  await expect(editor.getByText(/Unsaved|未保存/)).toHaveCount(0);

  await closeTab(page, EDITOR_TAB_NAME);
  await expect(dialog).toHaveCount(0);
  await expect(tab(page, EDITOR_TAB_NAME)).toHaveCount(0);
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).toBeNull();

  expect(errors).toEqual([]);
});

test('custom relation select changes protect a dirty editor close and cancel keeps the selection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await page.locator('[data-open-workspace-editor="crm_accounts"]').click();
  await expectActiveTab(page, EDITOR_TAB_NAME);

  const owner = ownerField(page);
  await owner.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: /Priya Raman/ }).click();
  await expect(owner.getByText('Priya Raman')).toBeVisible();
  await expect(workspaceRoot(page)).toHaveAttribute(
    'data-workspace-dirty-tabs',
    new RegExp(EDITOR_TAB_ID),
  );

  await closeTab(page, EDITOR_TAB_NAME);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/unsaved changes|未保存的修改/);
  await dialog.getByRole('button', { name: /Cancel|取消/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(tab(page, EDITOR_TAB_NAME)).toBeVisible();
  await expect(owner.getByText('Priya Raman')).toBeVisible();

  expect(errors).toEqual([]);
});

test('confirming a dirty editor close removes the tab and its adapter snapshot', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await page.locator('[data-open-workspace-editor="crm_accounts"]').click();
  await expectActiveTab(page, EDITOR_TAB_NAME);

  const input = accountNameInput(page);
  await input.fill('Confirmed close draft');
  await expect(workspaceRoot(page)).toHaveAttribute(
    'data-workspace-dirty-tabs',
    new RegExp(EDITOR_TAB_ID),
  );
  await tab(page, /Revenue Opportunities|收入机会/).click();
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).not.toBeNull();
  await tab(page, EDITOR_TAB_NAME).click();

  await closeTab(page, EDITOR_TAB_NAME);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Confirm|确认/ }).click();

  await expect(dialog).toHaveCount(0);
  await expect(tab(page, EDITOR_TAB_NAME)).toHaveCount(0);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).toBeNull();

  await page.locator('[data-open-workspace-editor="crm_accounts"]').click();
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(workspaceRoot(page)).toHaveAttribute('data-workspace-dirty-tabs', '');

  expect(errors).toEqual([]);
});

function draftPrompt(page: Page) {
  return page.locator(`[data-workspace-draft-prompt="${EDITOR_TAB_ID}"]`);
}

test('reload shows the server value first, then only an explicit draft restore writes the form', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await page.locator('[data-open-workspace-editor="crm_accounts"]').click();
  await expectActiveTab(page, EDITOR_TAB_NAME);

  const input = accountNameInput(page);
  await expect(input).toHaveValue('Helio Manufacturing');
  await input.fill('Helio Manufacturing Draft Before Discard');
  await expect(workspaceRoot(page)).toHaveAttribute(
    'data-workspace-dirty-tabs',
    new RegExp(EDITOR_TAB_ID),
  );

  await tab(page, /Revenue Opportunities|收入机会/).click();
  await tab(page, EDITOR_TAB_NAME).click();
  await expect(input).toHaveValue('Helio Manufacturing Draft Before Discard');
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).not.toBeNull();

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(editorPane(page)).toBeVisible();
  // 先读服务端值；刷新本身绝不自动写回草稿。
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(workspaceRoot(page)).toHaveAttribute('data-workspace-dirty-tabs', '');
  await expect(draftPrompt(page)).toBeVisible();
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');

  await draftPrompt(page).getByRole('button', { name: /Discard draft|丢弃草稿/ }).click();
  await expect(draftPrompt(page)).toHaveCount(0);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(draftPrompt(page)).toHaveCount(0);

  // 保存路径：显式恢复草稿 -> 保存 -> 刷新后只看到已保存的服务端值，不再出现草稿提示。
  await accountNameInput(page).fill('Helio Manufacturing Draft Before Save');
  await expect(workspaceRoot(page)).toHaveAttribute(
    'data-workspace-dirty-tabs',
    new RegExp(EDITOR_TAB_ID),
  );
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).not.toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(draftPrompt(page)).toBeVisible();
  await draftPrompt(page).getByRole('button', { name: /Restore draft|恢复草稿/ }).click();
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing Draft Before Save');
  await expect(workspaceRoot(page)).toHaveAttribute(
    'data-workspace-dirty-tabs',
    new RegExp(EDITOR_TAB_ID),
  );
  await editorPane(page).getByRole('button', { name: /Save|保存/ }).click();
  await expect.poll(() => workspaceRoot(page).getAttribute('data-workspace-dirty-tabs')).toBe('');

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing Draft Before Save');
  await expect(draftPrompt(page)).toHaveCount(0);
  await expect(workspaceRoot(page)).toHaveAttribute('data-workspace-dirty-tabs', '');

  await closeTab(page, EDITOR_TAB_NAME);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(tab(page, EDITOR_TAB_NAME)).toHaveCount(0);
  await expectActiveTab(page, /Revenue Opportunities|收入机会/);

  expect(errors).toEqual([]);
});

test('a stored draft whose declared-field baseline no longer matches is not restored', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await login(page);
  await openWorkspace(page, 'crm_accounts');
  await page.locator('[data-open-workspace-editor="crm_accounts"]').click();
  await expectActiveTab(page, EDITOR_TAB_NAME);

  const input = accountNameInput(page);
  await expect(input).toHaveValue('Helio Manufacturing');
  await input.fill('Helio Manufacturing Tampered Draft');
  await tab(page, /Revenue Opportunities|收入机会/).click();
  await tab(page, EDITOR_TAB_NAME).click();
  await expect.poll(() => persistedTabStateKey(page, EDITOR_TAB_ID)).not.toBeNull();

  const storageKey = await persistedTabStateKey(page, EDITOR_TAB_ID);
  if (!storageKey) throw new Error('draft storage key is missing');
  // 在应用启动前修改候选，避免 pagehide 快照覆盖；丢弃后不重新创建草稿。
  await page.addInitScript(({ key }) => {
    const marker = `${key}:tampered-once`;
    if (sessionStorage.getItem(marker) === '1') return;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    const envelope = JSON.parse(raw) as { draftData?: Record<string, unknown> };
    const draftData = envelope.draftData ?? {};
    draftData.accountName = 'Helio Manufacturing Tampered Draft';
    draftData.__workspaceDraftBaseline = { accountName: 'Tampered baseline' };
    envelope.draftData = draftData;
    sessionStorage.setItem(key, JSON.stringify(envelope));
    sessionStorage.setItem(marker, '1');
  }, { key: storageKey });

  await page.reload();
  expect(await page.evaluate(key => {
    const envelope = JSON.parse(sessionStorage.getItem(key) ?? '{}') as {
      draftData?: { __workspaceDraftBaseline?: { accountName?: string } };
    };
    return envelope.draftData?.__workspaceDraftBaseline?.accountName;
  }, storageKey)).toBe('Tampered baseline');
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(draftPrompt(page)).toBeVisible();
  await draftPrompt(page).getByRole('button', { name: /Restore draft|恢复草稿/ }).click();

  await expect(editorPane(page).locator('[data-workspace-draft-conflict]')).toBeVisible();
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(workspaceRoot(page)).toHaveAttribute('data-workspace-dirty-tabs', '');
  await expect(draftPrompt(page)).toBeVisible();

  await draftPrompt(page).getByRole('button', { name: /Discard draft|丢弃草稿/ }).click();
  await expect(draftPrompt(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations multi-tab workspace|运营多标签工作区/ })).toBeVisible({ timeout: 20_000 });
  await expectActiveTab(page, EDITOR_TAB_NAME);
  await expect(accountNameInput(page)).toHaveValue('Helio Manufacturing');
  await expect(draftPrompt(page)).toHaveCount(0);

  expect(errors).toEqual([]);
});
