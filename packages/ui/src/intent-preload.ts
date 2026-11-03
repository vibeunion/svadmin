/**
 * Intent preload: start a dynamic import on hover, focus, or viewport entry.
 *
 * This is the part of Arco's component lazy-load plugin worth keeping. It does
 * not rewrite imports. SSR never calls the loader; the host renders its fallback
 * until the client preloads.
 */

export const INTENT_PRELOAD_BUDGET = Object.freeze({
  maxInflight: 2,
  /** Source budget for this module. Enforced by intent-preload.test.ts. */
  maxModuleBytes: 4_000,
});

export interface IntentPreloadParams {
  key: string;
  load: () => Promise<unknown>;
}

const inflight = new Map<string, Promise<unknown>>();

export function resetIntentPreloads(): void {
  inflight.clear();
}

function onServer(ssr: boolean | undefined): boolean {
  return ssr ?? typeof window === 'undefined';
}

/** Returns the in-flight promise, or undefined when SSR or the budget is full. */
export function preloadModule(
  key: string,
  loader: () => Promise<unknown>,
  options: { ssr?: boolean } = {},
): Promise<unknown> | undefined {
  if (key.trim() === '' || onServer(options.ssr)) return undefined;
  const existing = inflight.get(key);
  if (existing) return existing;
  if (inflight.size >= INTENT_PRELOAD_BUDGET.maxInflight) return undefined;
  let pending: Promise<unknown>;
  try {
    pending = Promise.resolve(loader());
  } catch (error) {
    pending = Promise.reject(error);
  }
  const settled = pending.finally(() => {
    if (inflight.get(key) === settled) inflight.delete(key);
  });
  inflight.set(key, settled);
  return settled;
}

/**
 * Svelte action. On the server it is a no-op so the fallback markup stays put.
 */
export function intentPreload(node: HTMLElement, params: IntentPreloadParams): { destroy: () => void; update: (next: IntentPreloadParams) => void } {
  if (onServer(undefined)) return { destroy() {}, update() {} };
  let current = params;
  let started = false;
  const start = (): void => {
    if (started) return;
    started = true;
    void preloadModule(current.key, current.load, { ssr: false });
  };
  node.addEventListener('pointerenter', start);
  node.addEventListener('focus', start);
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    })
    : undefined;
  observer?.observe(node);
  return {
    destroy() {
      node.removeEventListener('pointerenter', start);
      node.removeEventListener('focus', start);
      observer?.disconnect();
    },
    update(next: IntentPreloadParams) {
      current = next;
    },
  };
}
