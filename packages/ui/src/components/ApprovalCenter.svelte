<script lang="ts">
  import { ChevronLeft, ChevronRight, RefreshCw, Search } from '@lucide/svelte';
  import { onDestroy, untrack } from 'svelte';
  import { captureAdminContext, captureAuthSession, createEnterpriseRequestContext } from '@svadmin/core';
  import {
    ApprovalContractError, decodeApprovalList, decodeApprovalReceipt, decodeApprovalTransition,
  } from '@svadmin/core';
  import type {
    ApprovalProvider, ApprovalRecord, ApprovalTransition, EnterpriseProviderRequestContext,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import * as Dialog from './ui/dialog/index.js';
  import DataState from './content/DataState.svelte';

  type ApprovalView = 'pending' | 'history';
  interface Props {
    provider: ApprovalProvider;
    requestContext?: EnterpriseProviderRequestContext;
    pageSize?: number;
    title?: string;
  }

  let { provider, requestContext, pageSize = 20, title }: Props = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  let view = $state<ApprovalView>('pending');
  let search = $state('');
  let appliedSearch = $state('');
  let page = $state(1);
  let records = $state<ApprovalRecord[]>([]);
  let total = $state(0);
  let selectedId = $state<string>();
  let loading = $state(false);
  let error = $state<'load' | 'invalid' | 'conflict' | 'action'>();
  let actionPending = $state(false);
  let comment = $state('');
  let targetId = $state('');
  let actionDialog = $state<string>();
  let actionOpen = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let mounted = true;
  let epoch = 0;
  let requestScope: EnterpriseProviderRequestContext | undefined;
  let generatedRequestContext: EnterpriseProviderRequestContext | undefined;
  let lastTransition: ApprovalTransition | undefined;
  onDestroy(() => { mounted = false; clearTimeout(timer); });

  const activeRecord = $derived(records.find(record => record.id === selectedId));
  const activeAction = $derived(
    activeRecord?.allowedActions.find(action => action.id === actionDialog),
  );
  const centerState = $derived(
    loading
      ? 'loading'
      : error && records.length === 0
        ? 'error'
        : records.length === 0
          ? (appliedSearch ? 'filtered-empty' : 'empty')
          : 'ready',
  );
  const normalizedPageSize = $derived(Number.isSafeInteger(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 20);
  const totalPages = $derived(Math.max(1, Math.ceil(total / normalizedPageSize)));

  function resolveRequestContext(): EnterpriseProviderRequestContext {
    if (requestContext) return requestContext;
    const tenant = context.tenantCacheKey?.__svadminTenant;
    if (typeof tenant !== 'string' && typeof tenant !== 'number') throw new Error('Missing tenant context');
    if (generatedRequestContext?.tenantId === tenant) return generatedRequestContext;
    generatedRequestContext = createEnterpriseRequestContext({ tenantId: tenant });
    return generatedRequestContext;
  }

  async function load(): Promise<void> {
    if (actionPending) return;
    const currentEpoch = ++epoch;
    lastTransition = undefined;
    loading = true;
    error = undefined;
    records = [];
    actionDialog = undefined;
    actionOpen = false;
    try {
      const scope = resolveRequestContext();
      requestScope = scope;
      const result = decodeApprovalList(await provider.list(scope, {
        view, page, pageSize: normalizedPageSize, search: appliedSearch,
      }));
      if (!mounted || currentEpoch !== epoch || requestScope !== scope) return;
      records = result.data;
      total = result.total;
      selectedId = result.data.some(record => record.id === selectedId) ? selectedId : result.data[0]?.id;
      actionDialog = undefined;
      actionOpen = false;
    } catch (cause) {
      if (!mounted || currentEpoch !== epoch) return;
      error = cause instanceof ApprovalContractError ? 'invalid' : 'load';
      records = [];
      total = 0;
      selectedId = undefined;
    } finally {
      if (mounted && currentEpoch === epoch) loading = false;
    }
  }

  function scheduleSearch(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    search = event.currentTarget.value;
    clearTimeout(timer);
    timer = setTimeout(() => {
      appliedSearch = search.trim().slice(0, 200);
      page = 1;
    }, 250);
  }

  function clearSearch(): void {
    clearTimeout(timer);
    search = '';
    appliedSearch = '';
    page = 1;
  }

  function switchView(next: ApprovalView): void {
    if (view === next) return;
    view = next;
    page = 1;
    selectedId = undefined;
  }

  function openAction(action: string): void {
    if (loading || actionPending) return;
    if (!activeRecord?.allowedActions.some(candidate => candidate.id === action)) return;
    actionDialog = action;
    actionOpen = true;
    error = undefined;
    comment = '';
    targetId = '';
  }

  async function submitAction(): Promise<void> {
    const record = activeRecord;
    const action = activeAction;
    const scope = requestScope;
    if (!record || !action || !scope || !provider.transition || actionPending || loading) return;
    let input: ApprovalTransition;
    try {
      const target = targetId.trim() || undefined;
      // 原样重试复用标识；不同载荷不能共用幂等键。
      const previous = lastTransition;
      const retry = previous?.id === record.id
        && previous.expectedVersion === record.version
        && previous.action === action.id
        && previous.comment === comment
        && previous.targetId === target;
      input = decodeApprovalTransition({
        id: record.id,
        expectedVersion: record.version,
        action: action.id,
        comment,
        ...(target ? { targetId: target } : {}),
        idempotencyKey: retry ? previous.idempotencyKey : `${record.id}:${record.version}:${action.id}:${crypto.randomUUID()}`,
      }, record);
    } catch {
      error = 'action';
      return;
    }
    lastTransition = { ...input };
    actionPending = true;
    const actionEpoch = epoch;
    error = undefined;
    try {
      const receipt = decodeApprovalReceipt(await provider.transition(scope, input), input);
      if (!mounted || actionEpoch !== epoch) return;
      if (!receipt.ok) {
        error = 'conflict';
        return;
      }
      lastTransition = undefined;
      actionDialog = undefined;
      actionOpen = false;
      records = records.map(candidate => candidate.id === receipt.record.id ? receipt.record : candidate);
      selectedId = receipt.record.id;
    } catch (cause) {
      if (!mounted || actionEpoch !== epoch) return;
      error = cause instanceof ApprovalContractError ? 'invalid' : 'action';
    } finally {
      if (mounted && actionEpoch === epoch) actionPending = false;
    }
  }

  function canSubmit(action: ApprovalRecord['allowedActions'][number]): boolean {
    return (!action.commentRequired || !!comment.trim()) && (!action.targetRequired || !!targetId.trim());
  }

  $effect(() => {
    void provider;
    void view;
    void page;
    void appliedSearch;
    void requestContext;
    void normalizedPageSize;
    void context.tenantCacheKey?.__svadminTenant;
    void captureAuthSession(context.authProvider).cacheKey;
    untrack(() => {
      records = [];
      selectedId = undefined;
      actionDialog = undefined;
      actionOpen = false;
      actionPending = false;
      void load();
    });
  });
</script>

<section class="svadmin-approval-center" aria-label={title ?? i18n.t('approval.title')} data-svadmin-approval-center data-svadmin-approval-view={view} data-svadmin-approval-state={centerState}>
  <header class="svadmin-approval-center__header" data-svadmin-approval-header>
    <div>
      <h2>{title ?? i18n.t('approval.title')}</h2>
    </div>
    <Button type="button" variant="outline" size="sm" aria-label={i18n.t('common.refresh')} disabled={loading || actionPending} onclick={() => void load()}>
      <RefreshCw class={loading ? 'svadmin-approval-center__spin' : ''} />
    </Button>
  </header>
  <div class="svadmin-approval-center__toolbar" data-svadmin-approval-toolbar>
    <Button type="button" aria-pressed={view === 'pending'} variant={view === 'pending' ? 'default' : 'outline'} onclick={() => switchView('pending')}>{i18n.t('approval.pending')}</Button>
    <Button type="button" aria-pressed={view === 'history'} variant={view === 'history' ? 'default' : 'outline'} onclick={() => switchView('history')}>{i18n.t('approval.history')}</Button>
    <label class="svadmin-approval-center__search">
      <Search aria-hidden="true" />
      <Input value={search} oninput={scheduleSearch} placeholder={i18n.t('approval.search')} aria-label={i18n.t('approval.search')} />
    </label>
  </div>
  {#if error && records.length > 0 && !actionOpen}
    <div role="alert">{i18n.t(`approval.${error}`)}</div>
  {/if}
  <div class="svadmin-approval-center__body" data-svadmin-approval-body>
    <div class="svadmin-approval-center__list" data-svadmin-approval-list>
      {#if loading}
        <DataState state="loading" />
      {:else if records.length === 0 && error}
        <DataState
          state="error"
          title={error === 'invalid' ? i18n.t('approval.invalid') : i18n.t('approval.load')}
          description={i18n.locale === 'zh-CN' ? '请刷新后重试。' : 'Refresh and retry.'}
          retry={() => void load()}
        />
      {:else if records.length === 0}
        <DataState
          state={appliedSearch ? 'filtered-empty' : 'empty'}
          {...(appliedSearch ? {} : { title: i18n.t('approval.empty') })}
        />
        {#if appliedSearch}
          <Button type="button" variant="outline" size="sm" onclick={clearSearch}>{i18n.t('common.clear')}</Button>
        {/if}
      {:else}
        {#each records as record (record.id)}
          <button type="button" aria-pressed={record.id === selectedId} class:selected={record.id === selectedId} onclick={() => selectedId = record.id}>
            <strong>{record.title}</strong>
            <span>{record.applicant} · {record.status}</span>
          </button>
        {/each}
      {/if}
    </div>
    <div class="svadmin-approval-center__detail" data-svadmin-approval-detail>
      {#if activeRecord}
        <h3>{activeRecord.title}</h3>
        <Badge variant="outline">{activeRecord.status}</Badge>
        <p>{i18n.t('approval.applicant', { name: activeRecord.applicant })}</p>
        {#if activeRecord.attachments.length}
          <h4>{i18n.t('approval.attachments')}</h4>
          <ul>{#each activeRecord.attachments as attachment (attachment.id)}<li>{attachment.name}</li>{/each}</ul>
        {/if}
        <h4>{i18n.t('approval.history')}</h4>
        <ol>{#each activeRecord.history as event (event.id)}<li>{event.actor} · {event.action} · {event.comment || '—'}</li>{/each}</ol>
        {#if provider.transition && activeRecord.allowedActions.length}
          <div class="svadmin-approval-center__actions">
            {#each activeRecord.allowedActions as action (action.id)}
              <Button type="button" disabled={actionPending} onclick={() => openAction(action.id)}>{action.label}</Button>
            {/each}
          </div>
        {/if}
      {:else}
        <p>{i18n.t('approval.select')}</p>
      {/if}
    </div>
  </div>
  <footer class="svadmin-approval-center__footer" data-svadmin-approval-pagination>
    <Button type="button" aria-label={i18n.t('common.prev')} title={i18n.t('common.prev')} variant="outline" disabled={page <= 1 || loading} onclick={() => { page -= 1; }}>
      <ChevronLeft />
    </Button>
    <span>{page} / {totalPages}</span>
    <Button type="button" aria-label={i18n.t('common.next')} title={i18n.t('common.next')} variant="outline" disabled={page >= totalPages || loading} onclick={() => { page += 1; }}>
      <ChevronRight />
    </Button>
  </footer>
</section>

<Dialog.Root bind:open={actionOpen}>
  {#if actionDialog && activeRecord}
    <Dialog.Content class="svadmin-approval-center__dialog" aria-label={activeAction?.label ?? i18n.t('common.confirmAction')}>
      <Dialog.Header>
        <Dialog.Title>{activeAction?.label}</Dialog.Title>
        <Dialog.Description>{i18n.t('approval.comment')}</Dialog.Description>
      </Dialog.Header>
      <label>{i18n.t('approval.comment')}
        <textarea bind:value={comment} required={activeAction?.commentRequired} maxlength={10000}></textarea>
      </label>
      {#if activeAction?.targetRequired}
        <label>{i18n.t('approval.target')}
          <Input bind:value={targetId} required maxlength={200} />
        </label>
      {/if}
      {#if error}<div role="alert">{i18n.t(`approval.${error}`)}</div>{/if}
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => { actionOpen = false; actionDialog = undefined; }}>{i18n.t('common.cancel')}</Button>
        <Button type="button" disabled={actionPending || !activeAction || !canSubmit(activeAction)} onclick={() => void submitAction()}>
          {actionPending ? i18n.t('common.processing') : i18n.t('common.confirm')}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<style>
  .svadmin-approval-center { display: grid; gap: 1rem; min-width: 0; }
  .svadmin-approval-center__header, .svadmin-approval-center__toolbar, .svadmin-approval-center__footer,
  .svadmin-approval-center__actions { display: flex; align-items: center; gap: 0.5rem; }
  .svadmin-approval-center__header, .svadmin-approval-center__footer { justify-content: space-between; }
  .svadmin-approval-center__toolbar { flex-wrap: wrap; }
  .svadmin-approval-center__search { display: flex; align-items: center; gap: 0.5rem; min-width: min(100%, 20rem); }
  .svadmin-approval-center__body { display: grid; grid-template-columns: minmax(12rem, 0.8fr) minmax(0, 1.6fr); border: 1px solid var(--border); }
  .svadmin-approval-center__list { border-inline-end: 1px solid var(--border); }
  .svadmin-approval-center__list button { display: grid; gap: 0.25rem; width: 100%; padding: 0.75rem; text-align: start; border-block-end: 1px solid var(--border); }
  .svadmin-approval-center__list button.selected { background: var(--muted); }
  .svadmin-approval-center__list span { color: var(--muted-foreground); font-size: 0.875rem; }
  .svadmin-approval-center__detail { display: grid; gap: 0.75rem; padding: 1rem; min-width: 0; }
  .svadmin-approval-center__detail ol, .svadmin-approval-center__detail ul { margin: 0; padding-inline-start: 1.25rem; }
  :global(.svadmin-approval-center__dialog) { display: grid; gap: 1rem; width: min(28rem, calc(100vw - 2rem)); }
  :global(.svadmin-approval-center__dialog textarea) { min-height: 6rem; width: 100%; }
  :global(.svadmin-approval-center__spin) { animation: svadmin-approval-spin 1s linear infinite; }
  @keyframes svadmin-approval-spin { to { transform: rotate(360deg); } }
  @media (max-width: 640px) { .svadmin-approval-center__body { grid-template-columns: 1fr; } .svadmin-approval-center__list { border-inline-end: 0; border-block-end: 1px solid var(--border); max-height: 15rem; overflow: auto; } }
</style>
