import { onDestroy } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { captureAdminContext, captureAuthSession, queryKeyMatches, TaskError, withValidatedTaskProvider } from '@svadmin/core';
import type { TaskProvider } from '@svadmin/core';
import { useQueryClient } from '@tanstack/svelte-query';

type ActionScope = {
  provider: TaskProvider | undefined;
  id: string;
  tenant: unknown;
  auth: unknown;
  router: unknown;
  access: unknown;
  session: ReturnType<typeof captureAuthSession>;
};
type ActionClaim = { scope: ActionScope };

// 同一任务的重试与取消共享一个在途声明，避免不同按钮或重复挂载同时写入。
let nextProviderId = 1;
const providerIds = new WeakMap<TaskProvider, number>();
const actionClaims = new SvelteMap<string, ActionClaim>();
function claimKey(scope: ActionScope): string | undefined {
  if (!scope.provider) return undefined;
  let providerId = providerIds.get(scope.provider);
  if (providerId === undefined) {
    providerId = nextProviderId++;
    providerIds.set(scope.provider, providerId);
  }
  return JSON.stringify([providerId, scope.id, scope.tenant ?? null, scope.session.cacheKey]);
}
function sameActionScope(left: ActionScope, right: ActionScope): boolean {
  return left.provider === right.provider && left.id === right.id
    && left.tenant === right.tenant && left.auth === right.auth
    && left.router === right.router && left.access === right.access
    && left.session.cacheKey === right.session.cacheKey && left.session.isCurrent();
}

export function createTaskAction(options: {
  action: 'cancel' | 'retry';
  taskId: string;
  provider?: TaskProvider | undefined;
  disabled: boolean;
  onSuccess?: (() => void) | undefined;
  onError?: ((error: unknown) => void) | undefined;
}) {
  const context = captureAdminContext();
  const client = useQueryClient();
  const provider = $derived(options.provider ?? context.taskProvider);
  const scope = $derived({
    provider, id: options.taskId, tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider, session: captureAuthSession(context.authProvider),
    router: context.routerProvider, access: context.accessControlProvider,
  });
  let mounted = true;
  let attempt = $state.raw<{ scope: typeof scope }>();
  let failureScope = $state.raw<typeof scope>();
  function current(origin: typeof scope): boolean {
    return mounted && origin.provider === scope.provider && origin.id === scope.id
      && origin.tenant === scope.tenant && origin.auth === scope.auth
      && origin.router === scope.router && origin.access === scope.access
      && origin.session.isCurrent();
  }
  onDestroy(() => {
    mounted = false;
    // 卸载只停止结果交付；在途声明由请求结算释放，避免按钮切换重开并发窗口。
    attempt = undefined;
  });
  $effect.pre(() => {
    if (attempt && !current(attempt.scope)) attempt = undefined;
    if (failureScope && !current(failureScope)) failureScope = undefined;
  });
  const claim = $derived.by(() => {
    const key = claimKey(scope);
    if (!key) return undefined;
    const currentClaim = actionClaims.get(key);
    return currentClaim && sameActionScope(currentClaim.scope, scope) ? currentClaim : undefined;
  });
  const pending = $derived(!!claim);
  const available = $derived(!options.disabled && scope.session.available && !!provider?.[options.action]);

  async function run(): Promise<void> {
    if (!available || pending || !mounted || !provider) return;
    const origin = scope;
    const key = claimKey(origin);
    if (!key) return;
    const existing = actionClaims.get(key);
    if (existing && sameActionScope(existing.scope, origin)) return;
    const token = { scope: origin };
    const matcher = context.queryKeyMatcher();
    const success = options.onSuccess;
    const failure = options.onError;
    failureScope = undefined;
    attempt = token;
    actionClaims.set(key, token);
    let error: unknown;
    let failed = false;
    let deliver: boolean;
    try {
      const operation = withValidatedTaskProvider(provider)[options.action];
      if (!operation) return;
      await operation(origin.id);
      if (!current(origin) || attempt !== token) return;
      await Promise.allSettled([client.invalidateQueries({
        predicate: query => queryKeyMatches(query.queryKey, { ...matcher, kind: 'task', action: 'list' })
          || queryKeyMatches(query.queryKey, { ...matcher, kind: 'task', action: 'one', id: origin.id }),
      })]);
    } catch (cause) {
      failed = true;
      error = cause instanceof TaskError ? cause : new TaskError('TASK_PROVIDER_FAILED');
    } finally {
      deliver = current(origin) && attempt === token;
      if (attempt === token) attempt = undefined;
      if (actionClaims.get(key) === token) actionClaims.delete(key);
    }
    if (!deliver || !current(origin)) return;
    if (failed) failureScope = origin;
    // 观察者异常不能被误报为服务端操作失败，也不能形成未处理的 Promise。
    try {
      if (failed) await failure?.(error);
      else await success?.();
    } catch { /* 回调由宿主管理，不重试已发出的写入。 */ }
  }
  return {
    run,
    get pending() { return pending; },
    get available() { return available; },
    get failed() { return !!failureScope && current(failureScope); },
  };
}
