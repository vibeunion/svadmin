import { onDestroy } from 'svelte';
import { captureAdminContext, captureAuthSession, queryKeyMatches, TaskError, withValidatedTaskProvider } from '@svadmin/core';
import type { TaskProvider } from '@svadmin/core';
import { useQueryClient } from '@tanstack/svelte-query';

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
  function current(origin: typeof scope): boolean {
    return mounted && origin.provider === scope.provider && origin.id === scope.id
      && origin.tenant === scope.tenant && origin.auth === scope.auth
      && origin.router === scope.router && origin.access === scope.access
      && origin.session.isCurrent();
  }
  onDestroy(() => { mounted = false; attempt = undefined; });
  $effect.pre(() => {
    if (attempt && !current(attempt.scope)) attempt = undefined;
  });
  const pending = $derived(!!attempt && current(attempt.scope));
  const available = $derived(!options.disabled && scope.session.available && !!provider?.[options.action]);

  async function run(): Promise<void> {
    if (!available || pending || !mounted || !provider) return;
    const origin = scope;
    const token = { scope: origin };
    const matcher = context.queryKeyMatcher();
    const success = options.onSuccess;
    const failure = options.onError;
    attempt = token;
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
    }
    if (!deliver || !current(origin)) return;
    // 观察者异常不能被误报为服务端操作失败，也不能形成未处理的 Promise。
    try {
      if (failed) await failure?.(error);
      else await success?.();
    } catch { /* 回调由宿主管理，不重试已发出的写入。 */ }
  }
  return { run, get pending() { return pending; }, get available() { return available; } };
}
