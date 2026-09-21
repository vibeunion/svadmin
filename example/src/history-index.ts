const marker = '__svadminExampleHistoryIndex';
interface HistoryGuard {
  popstate: (event: PopStateEvent) => void;
  hashchange: (event: HashChangeEvent) => void;
}
const guards = new Set<HistoryGuard>();

export function registerExampleHistoryGuard(guard: HistoryGuard): () => void {
  guards.add(guard);
  return () => { guards.delete(guard); };
}

function readIndex(state: unknown): number | undefined {
  if (!state || typeof state !== 'object' || !(marker in state)) return undefined;
  const index: unknown = Reflect.get(state, marker);
  return typeof index === 'number' && Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}

export function exampleHistoryIndex(): number | undefined {
  return window.navigation?.currentEntry?.index ?? readIndex(window.history.state);
}

/** 在应用挂载前跟踪所有工作区的历史条目，避免局部页面猜测未标记条目的方向。 */
export function trackExampleHistory(target: Window = window): () => void {
  const history = target.history;
  const push = history.pushState;
  const replace = history.replaceState;
  let index = readIndex(history.state) ?? 0;
  function stamped(state: unknown, position: number): Record<string, unknown> {
    return { ...(state && typeof state === 'object' ? state : {}), [marker]: position };
  }
  replace.call(history, stamped(history.state, index), '', target.location.href);
  history.pushState = function (state: unknown, unused: string, url?: string | URL | null) {
    const next = index + 1;
    push.call(history, stamped(state, next), unused, url);
    index = next;
  };
  history.replaceState = function (state: unknown, unused: string, url?: string | URL | null) {
    replace.call(history, stamped(state, index), unused, url);
  };
  const synchronize = (event: Event) => {
    const entry = readIndex(history.state);
    if (entry !== undefined) {
      index = entry;
    } else {
      // 原生 hash 链接创建 null-state 条目；应用启动后的旧条目都已经带有序号。
      const next = index + 1;
      replace.call(history, stamped(history.state, next), '', target.location.href);
      index = next;
    }
    // Window 自身事件不能依赖后注册的 capture 监听器抢在路由同步之前执行。
    for (const guard of guards) {
      if (event instanceof PopStateEvent) guard.popstate(event);
      else if (event instanceof HashChangeEvent) guard.hashchange(event);
      if (event.cancelBubble) break;
    }
  };
  target.addEventListener('popstate', synchronize, true);
  target.addEventListener('hashchange', synchronize, true);
  return () => {
    target.removeEventListener('popstate', synchronize, true);
    target.removeEventListener('hashchange', synchronize, true);
    history.pushState = push;
    history.replaceState = replace;
  };
}
