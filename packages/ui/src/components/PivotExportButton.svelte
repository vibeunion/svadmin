<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { Download } from '@lucide/svelte';
  import {
    captureAdminContext, captureAuthSession, useCan, useSubmitTask, useTask,
    downloadExportArtifact, safeArtifactUrl, useTranslation,
    type TaskProvider, type ExportFormat,
  } from '@svadmin/core';
  import { buildPivotExportRequest, snapshotPivotExportTaskResult, type PivotQuery } from '@svadmin/core/pivot';
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';
  import { normalizeTaskStatus } from './task-utils';
  import { Button } from './ui/button/index.js';

  let { query, scopeKey, taskName, taskProvider, idempotencyKey, initialTaskId,
    format = 'csv', disabled = false, onTaskSubmitted }: {
    query: PivotQuery;
    scopeKey: string;
    taskName: string;
    taskProvider?: TaskProvider;
    idempotencyKey?: string;
    initialTaskId?: string;
    format?: ExportFormat;
    disabled?: boolean;
    onTaskSubmitted?: (id: string) => void | Promise<void>;
  } = $props();

  const context = captureAdminContext();
  const i18n = useTranslation();
  const request = $derived(buildPivotExportRequest(query, scopeKey, format));
  const permission = useCan(() => ({
    resource: query.resource, action: 'export',
    queryOptions: { enabled: !disabled && !!request },
  }));
  const scope = $derived({
    signature: JSON.stringify(request), provider: taskProvider ?? context.taskProvider,
    taskName, idempotencyKey, tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider, session: captureAuthSession(context.authProvider),
    access: context.accessControlProvider, router: context.routerProvider,
  });
  const allowed = $derived(!disabled && !!request && permission.allowed && scope.session.available);
  let mounted = true;
  function current(origin: typeof scope) {
    return mounted && origin.signature === scope.signature && origin.provider === scope.provider
      && origin.taskName === scope.taskName && origin.idempotencyKey === scope.idempotencyKey
      && origin.tenant === scope.tenant && origin.auth === scope.auth
      && origin.access === scope.access && origin.router === scope.router && origin.session.isCurrent();
  }

  let owner = $state.raw<typeof scope | undefined>(untrack(() => initialTaskId ? scope : undefined));
  let taskId = $state<string | undefined>(untrack(() => initialTaskId));
  let attempt = $state.raw<{ origin: typeof scope }>();
  let error = $state(false);
  let completedId = $state<string>();
  let wasAllowed = false;
  const ownedId = $derived(owner && current(owner) && allowed ? taskId : undefined);
  const submit = useSubmitTask();
  const task = useTask(definedReactiveOptions({
    get taskId() { return ownedId; },
    get taskProvider() { return scope.provider; },
    errorNotification: false,
    successNotification: false,
    get queryOptions() {
      return { enabled: !!ownedId && !!scope.provider,
        refetchInterval: ownedId && ownedId !== completedId ? 2000 : false as const };
    },
  }));
  const status = $derived(ownedId ? normalizeTaskStatus(task.data?.status) : 'unknown');
  const terminal = $derived(['completed', 'failed', 'cancelled'].includes(status));
  $effect(() => { if (ownedId && terminal) completedId = ownedId; });
  const artifact = $derived.by(() => {
    if (!ownedId || status !== 'completed' || !request || !idempotencyKey) return;
    const result = snapshotPivotExportTaskResult(task.data?.result ?? task.data?.result_data, { taskName, idempotencyKey, request });
    if (!result || !safeArtifactUrl(result.downloadUrl)) return;
    return {
      format: result.format, downloadUrl: result.downloadUrl,
      ...(result.fileName ? { fileName: result.fileName } : {}),
    };
  });
  const failed = $derived(error || (!!ownedId && (task.isError || status === 'failed'
    || (status === 'completed' && !artifact))));
  const busy = $derived(!!attempt && current(attempt.origin));
  const pending = $derived(!!ownedId && !terminal && !task.isError);

  onDestroy(() => { mounted = false; attempt = undefined; });
  $effect.pre(() => {
    const revoked = wasAllowed && !allowed;
    wasAllowed = allowed;
    if (owner && (!current(owner) || revoked)) {
      owner = undefined; taskId = undefined; completedId = undefined; error = false;
    }
    if (attempt && (!current(attempt.origin) || !allowed)) { attempt = undefined; error = false; }
  });

  async function run() {
    if (!allowed || busy || !request || !scope.provider) return;
    const origin = scope;
    const source = scope.provider;
    if (ownedId) {
      if (artifact && owner && current(owner)) {
        const token = { origin };
        const receipt = artifact;
        const resource = request.query.resource;
        attempt = token;
        error = false;
        try {
          const checked = origin.access ? await origin.access.can(definedOptions({
            resource, action: 'export', meta: request.query.meta,
          })) : { can: true };
          if (attempt !== token || !current(origin) || !allowed) return;
          if (!checked.can) {
            owner = undefined; taskId = undefined; error = true;
            return;
          }
          downloadExportArtifact(receipt, resource);
        } catch {
          if (attempt === token && current(origin) && allowed) error = true;
        } finally {
          if (attempt === token) attempt = undefined;
        }
      } else if (task.isError) {
        try { await task.refetch(); } catch { /* 查询状态提供脱敏错误。 */ }
      }
      return;
    }
    if (!taskName.trim() || !idempotencyKey?.trim()) { error = true; return; }
    const token = { origin };
    const notify = onTaskSubmitted;
    attempt = token;
    error = false;
    try {
      const handle = await submit.mutation.mutateAsync({
        taskName, taskProvider: source,
        options: { idempotencyKey, body: { ...request } },
        successNotification: false, errorNotification: false,
      });
      if (attempt !== token || !current(origin) || !allowed) return;
      owner = origin;
      taskId = handle.id;
      try { void Promise.resolve(notify?.(handle.id)).catch(() => {}); } catch { /* 不重发已提交任务。 */ }
    } catch {
      if (attempt === token && current(origin) && allowed) error = true;
    } finally {
      if (attempt === token) attempt = undefined;
    }
  }

  const label = $derived(artifact ? i18n.t('common.download') : task.isError && ownedId
    ? i18n.t('common.retry') : busy || pending ? i18n.t('common.processing')
    : ownedId && terminal ? i18n.t(status === 'cancelled' ? 'task.status.cancelled' : 'common.error')
    : i18n.t('common.export'));
</script>

<Button variant="outline" size="sm" onclick={run} aria-busy={busy || pending}
  disabled={!allowed || !scope.provider || busy || (!!ownedId && !artifact && !task.isError)}>
  <Download aria-hidden="true" />{label}
</Button>
{#if allowed && failed}<p role="alert">{i18n.t('common.error')}</p>{/if}
