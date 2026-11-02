<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { captureAdminContext, useGetIdentity, useParsed } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type {
    WorkspaceTab,
    WorkspaceTabLimitReachedDetail,
    WorkspaceTabOpenResult,
  } from '@svadmin/ui/components/MultiTabKeepAlive.svelte';
  import {
    createWorkspaceTabStateAdapter,
    type ListStateSnapshot,
    type WorkspaceDraftJsonObject,
    type WorkspaceTabStateAdapter,
  } from '@svadmin/ui';
  import WorkspaceTabsView from './WorkspaceTabsView.svelte';
  import {
    adapterDraftFields,
    businessDraftValues,
    createSessionTabStateStorage,
    createSyncSenderId,
    createWorkspaceEditorTab,
    createWorkspaceTab,
    createWorkspaceTabFromId,
    decodePersistedListState,
    DEFAULT_EDITOR_RECORD_ID,
    DEFAULT_RESOURCE,
    DEFAULT_RESOURCES,
    DRAFT_BASELINE_KEY,
    draftFieldKeys,
    encodePersistedListState,
    isRecord,
    MAX_TABS,
    parseRequestedWorkspaceTab,
    parseSyncTabIds,
    parseWorkspaceTabId,
    type PendingRemoteTabState,
    readStoredWorkspaceTabs,
    TAB_STATE_KEY_PREFIX,
    TAB_SYNC_VERSION,
    stableDraftJson,
    validWorkspaceTabIds,
    withoutTab,
    workspaceSyncChannelName,
    writeStoredWorkspaceTabs,
    type EditableResource,
    type WorkspaceResource,
    type WorkspaceTabsSyncMessage,
  } from './workspace-tabs-model';
  import { createWorkspaceScrollController } from './workspace-tabs-scroll';
  import './workspace-tabs.css';
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const parsed = useParsed();
  const isZh = $derived(i18n.locale === 'zh-CN');

  interface WorkspaceDraftEditorHandle {
    restoreDraft(candidate: Record<string, unknown>): boolean;
    cancelDraftRestore(): void;
    getDraftToken(): symbol;
  }

  function resourceLabel(resource: WorkspaceResource | EditableResource): string {
    return adminContext.getResource(resource).label || resource;
  }

  function createTab(resource: WorkspaceResource): WorkspaceTab { return createWorkspaceTab(resource, resourceLabel(resource)); }

  function createEditorTab(resource: EditableResource, recordId: string): WorkspaceTab {
    return createWorkspaceEditorTab(resource, recordId, resourceLabel(resource), isZh);
  }

  function createTabFromId(id: string): WorkspaceTab | undefined {
    return createWorkspaceTabFromId(id, resourceLabel, isZh);
  }

  function requestedTabIdFromLocation(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return parseRequestedWorkspaceTab(window.location.hash);
  }

  const initialRequestedTabId = untrack(requestedTabIdFromLocation);
  const initialTabIds: string[] = [...DEFAULT_RESOURCES];
  if (initialRequestedTabId && !initialTabIds.includes(initialRequestedTabId as WorkspaceResource)) {
    initialTabIds.push(initialRequestedTabId);
  }
  const identity = useGetIdentity();
  const sessionScope = $derived.by(() => {
    const data = identity.data;
    if (!data) return undefined;
    const id = typeof data.id === 'string' ? data.id : '';
    const email = typeof data.email === 'string' ? data.email : '';
    if (!id && !email) return undefined;
    // 精确 tuple 编码避免 trim 合并或分隔符碰撞，不用字段内容猜身份。
    return `identity:${JSON.stringify([id, email])}`;
  });

  let tabs = $state<WorkspaceTab[]>(
    initialTabIds.flatMap((id) => {
      const tab = createTabFromId(id);
      return tab ? [tab] : [];
    }),
  );
  let activeTabId = $state<string>(initialRequestedTabId ?? DEFAULT_RESOURCE);
  let notice = $state('');
  interface PendingWorkspaceDraft {
    data: Record<string, unknown>;
  }
  let pendingDrafts = $state<Record<string, PendingWorkspaceDraft>>({});
  const suppressedDraftTabs = new Set<string>();
  const draftDirtyTabs = new Set<string>();
  let editorInstances = $state<Record<string, WorkspaceDraftEditorHandle | null | undefined>>({});
  function forgetEditorInstance(tabId: string): void {
    if (Object.prototype.hasOwnProperty.call(editorInstances, tabId)) {
      editorInstances[tabId] = undefined;
    }
  }
  let root: HTMLDivElement | undefined = $state();
  let tabsRef: { openTab: (tab: WorkspaceTab) => Promise<WorkspaceTabOpenResult> } | undefined = $state();
  let tabSyncChannel: BroadcastChannel | undefined;
  let tabSyncReady = $state(0);
  const tabSyncSenderId = createSyncSenderId();
  let tabSyncScope: string | undefined;
  let pendingRemoteTabState: PendingRemoteTabState | undefined;
  let lastPublishedTabIds: string | undefined;
  let tabSyncRevision = 0;
  let lastAcceptedStateRevision = 0;
  let lastAcceptedStateSenderId = tabSyncSenderId;
  let tabSyncLocalMutation = $state(0);

  let adapter: WorkspaceTabStateAdapter | undefined;
  let adapterScope: string | undefined;
  let hydratedScope = $state<string | undefined>(undefined);
  let localTabsChanged = false;
  const opening = new Set<string>();
  const editorGuards = new Map<string, (fn: () => void) => void>();
  const editorGuardTokens = new Map<string, symbol>();
  let pendingTabId: string | undefined;
  let previousActiveId = untrack(() => activeTabId);
  let disposed = false;
  let guardScope = untrack(() => sessionScope);

  $effect.pre(() => {
    const scope = sessionScope;
    if (scope === guardScope) return;
    guardScope = scope;
    // 身份作用域变化后旧 editor guard 与其待确认动作全部退休；新表单会重新注册。
    editorGuards.clear();
    editorGuardTokens.clear();
    pendingDrafts = {};
    suppressedDraftTabs.clear();
    draftDirtyTabs.clear();
    for (const tabId of Object.keys(editorInstances)) forgetEditorInstance(tabId);
  });

  onDestroy(() => {
    if (root?.isConnected) scrollController.captureAllTabs(tabs);
    disposed = true;
    scrollController.cancelRestore();
    scrollController.dispose();
    adapter?.dispose();
  });

  onMount(() => {
    const handlePageHide = () => scrollController.captureAllTabs(tabs);
    const handleLocationChange = () => {
      const path = (window.location.hash.replace(/^#/, '') || '/').split('?')[0] ?? '/';
      if (path === '/workspace') return;
      if (root?.isConnected) scrollController.captureAllTabs(tabs);
    };
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : undefined;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      const next = new URL(anchor.href, window.location.href);
      const path = (next.hash.replace(/^#/, '') || next.pathname).split('?')[0] ?? '/';
      if (path === '/workspace') return;
      if (root?.isConnected) scrollController.captureAllTabs(tabs);
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  });

  function currentAdapter(): WorkspaceTabStateAdapter | undefined {
    const scope = sessionScope;
    if (!scope) return undefined;
    if (!adapter || adapterScope !== scope) {
      adapter?.dispose();
      adapter = createWorkspaceTabStateAdapter({
        tenantId: scope,
        storage: createSessionTabStateStorage() ?? null,
        keyPrefix: TAB_STATE_KEY_PREFIX,
        userId: scope,
        draftFields: adapterDraftFields(),
      });
      adapterScope = scope;
    }
    return adapter;
  }

  function clearDraftUiState(tabId: string): void {
    pendingDrafts = withoutTab(pendingDrafts, tabId);
    suppressedDraftTabs.delete(tabId);
    draftDirtyTabs.delete(tabId);
  }

  function workspaceTabIds(): string[] {
    return validWorkspaceTabIds(tabs);
  }

  function postWorkspaceTabState(force = false): void {
    const scope = sessionScope;
    const channel = tabSyncChannel;
    if (!scope || hydratedScope !== scope || !channel) return;
    const tabIds = workspaceTabIds();
    const serialized = JSON.stringify(tabIds);
    if (!force && serialized === lastPublishedTabIds) return;
    if (serialized !== lastPublishedTabIds) {
      tabSyncRevision += 1;
      lastAcceptedStateRevision = tabSyncRevision;
      lastAcceptedStateSenderId = tabSyncSenderId;
    }
    lastPublishedTabIds = serialized;
    const message: WorkspaceTabsSyncMessage = {
      version: TAB_SYNC_VERSION,
      type: 'state',
      scope,
      senderId: tabSyncSenderId,
      revision: tabSyncRevision,
      tabIds,
    };
    channel.postMessage(message);
  }

  function retireRemoteTab(tabId: string): void {
    scrollController.cancelRestore(tabId);
    editorGuards.delete(tabId);
    editorGuardTokens.delete(tabId);
    forgetEditorInstance(tabId);
    clearDraftUiState(tabId);
    currentAdapter()?.clear({ id: tabId });
  }

  function applyRemoteTabState(tabIds: string[]): void {
    const nextIds = new Set(tabIds);
    const removed = tabs.filter((tab) => !nextIds.has(tab.id));
    const protectedTabs = removed.filter((tab) => tab.dirty === true);
    if (protectedTabs.length > 0) {
      notice = isZh
        ? '其他窗口关闭了当前有未保存更改的标签，本窗口保留该标签。'
        : 'Another window closed a tab with unsaved changes; this window kept it open.';
      return;
    }

    const existing = new Map(tabs.map((tab) => [tab.id, tab]));
    for (const tab of removed) retireRemoteTab(tab.id);
    tabs = tabIds.flatMap((id) => {
      const current = existing.get(id);
      if (current) return [current];
      const tab = createTabFromId(id);
      return tab ? [tab] : [];
    });
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      activeTabId = tabs[0]?.id ?? '';
    }
    refreshPendingDrafts();
    lastPublishedTabIds = JSON.stringify(workspaceTabIds());
  }

  function markLocalTabCollectionChanged(): void {
    tabSyncLocalMutation += 1;
  }

  function receiveRemoteTabState(
    scope: string,
    revision: number,
    senderId: string,
    tabIds: string[],
  ): void {
    if (
      revision < lastAcceptedStateRevision
      || (revision === lastAcceptedStateRevision && senderId <= lastAcceptedStateSenderId)
    ) return;
    tabSyncRevision = revision;
    lastAcceptedStateRevision = revision;
    lastAcceptedStateSenderId = senderId;
    if (hydratedScope !== scope) {
      pendingRemoteTabState = { revision, senderId, tabIds };
      return;
    }
    applyRemoteTabState(tabIds);
  }

  function refreshPendingDrafts(): void {
    const tabAdapter = currentAdapter();
    if (!tabAdapter) return;
    const next: Record<string, PendingWorkspaceDraft> = {};
    for (const tab of tabs) {
      const descriptor = parseWorkspaceTabId(tab.id);
      if (descriptor?.kind !== 'editor') continue;
      if (suppressedDraftTabs.has(tab.id)) continue;
      const data = tabAdapter.restore({ id: tab.id, path: tab.path })?.draftData;
      if (!data) continue;
      const values = businessDraftValues(data, draftFieldKeys(descriptor.resource));
      if (Object.keys(values).length === 0) continue;
      next[tab.id] = { data };
    }
    pendingDrafts = next;
  }

  function persistEditorDraft(
    tab: WorkspaceTab,
    draft: Record<string, unknown> | undefined,
    token: symbol,
  ): void {
    // 关闭/重挂后旧实例的迟到回调不能写入同 id 的新标签。
    const editor = editorInstances[tab.id];
    if (!editor || editor.getDraftToken() !== token) return;
    if (!tabs.some((candidate) => candidate.id === tab.id)) return;
    if (!draft) return;
    const descriptor = parseWorkspaceTabId(tab.id);
    if (descriptor?.kind !== 'editor') return;
    const tabAdapter = currentAdapter();
    if (!tabAdapter) return;
    const fields = draftFieldKeys(descriptor.resource);
    const values = businessDraftValues(draft, fields);
    if (Object.keys(values).length === 0) return;
    const baseline = draft[DRAFT_BASELINE_KEY];
    const clean = isRecord(baseline)
      && stableDraftJson(values) === stableDraftJson(businessDraftValues(baseline, fields));
    if (clean) {
      // 初始干净回调保留待确认快照；只有编辑后真实回到基线才清除旧草稿。
      if (!draftDirtyTabs.has(tab.id)) return;
      draftDirtyTabs.delete(tab.id);
      const result = tabAdapter.clear({ id: tab.id });
      if (result?.storage === 'failed') {
        notice = isZh
          ? '草稿删除失败，刷新后仍可能出现旧草稿。'
          : 'The draft could not be deleted; it may reappear after refresh.';
      }
      return;
    }
    draftDirtyTabs.add(tab.id);
    tabAdapter.capture(
      { id: tab.id, path: tab.path },
      { draft: true, draftData: draft as WorkspaceDraftJsonObject },
    );
    const issue = tabAdapter.getLastDraftDataIssue();
    if (issue) {
      notice = isZh
        ? `草稿保存失败（${issue}），刷新后可能无法恢复。`
        : `Draft could not be saved (${issue}); it may not be recoverable after refresh.`;
    }
  }

  function confirmDraft(tab: WorkspaceTab): void {
    const pending = pendingDrafts[tab.id];
    if (!pending) return;
    const editor = editorInstances[tab.id];
    if (!editor) {
      notice = isZh ? '草稿恢复失败：编辑器尚未就绪。' : 'Draft restore failed: the editor is not ready.';
      return;
    }
    // 只有用户显式点击才调用实例入口；失败保留提示与候选，不自动重试。
    if (!editor.restoreDraft(pending.data)) {
      notice = isZh
        ? '草稿恢复失败，当前表单未改变。请重试或丢弃草稿。'
        : 'Draft restore failed and the form was left unchanged. Retry or discard the draft.';
      return;
    }
    handleDraftRestored(tab.id);
  }

  function discardDraft(tab: WorkspaceTab): void {
    clearDraftUiState(tab.id);
    editorInstances[tab.id]?.cancelDraftRestore();
    const result = currentAdapter()?.clear({ id: tab.id });
    if (result?.storage === 'failed') {
      notice = isZh
        ? '草稿删除失败，刷新后仍可能出现旧草稿。'
        : 'The draft could not be deleted; it may reappear after refresh.';
    }
  }

  function handleDraftRestored(tabId: string): void {
    // 已确认的草稿继续保留到保存或丢弃，但不再重复弹出确认提示。
    pendingDrafts = withoutTab(pendingDrafts, tabId);
    suppressedDraftTabs.add(tabId);
  }

  function handleEditorSaved(tabId: string): void {
    clearDraftUiState(tabId);
    editorInstances[tabId]?.cancelDraftRestore();
    const result = currentAdapter()?.clear({ id: tabId });
    if (result?.storage === 'failed') {
      notice = isZh
        ? '草稿清理失败，旧草稿可能在刷新后出现。'
        : 'Draft cleanup failed; an old draft may reappear after refresh.';
    }
  }

  function readTabListState(tab: WorkspaceTab): ListStateSnapshot | undefined {
    const tabAdapter = currentAdapter();
    if (!tabAdapter) return undefined;
    const state = tabAdapter.restore({ id: tab.id, path: tab.path });
    return decodePersistedListState(state?.query, tab);
  }

  function persistTabListState(tab: WorkspaceTab, snapshot: ListStateSnapshot): void {
    const tabAdapter = currentAdapter();
    if (!tabAdapter) return;
    tabAdapter.capture(
      { id: tab.id, path: tab.path },
      { query: encodePersistedListState(tab, snapshot) },
    );
  }

  const scrollController = createWorkspaceScrollController({
    getRoot: () => root,
    getAdapter: () => currentAdapter(),
    isDisposed: () => disposed,
    afterRender: tick,
    requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => cancelAnimationFrame(handle),
  });
  function replaceWithEmptyWorkspace(): void {
    if (typeof window === 'undefined') return;
    pendingTabId = undefined;
    const nextHash = '#/workspace';
    if (window.location.hash === nextHash) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function navigateToTab(tab: WorkspaceTab | undefined, type: 'push' | 'replace'): void {
    if (!tab) return;
    if ((parsed.params['tab'] ?? '') === tab.id) return;

    const nextHash = `/workspace?tab=${encodeURIComponent(tab.id)}`;
    if (window.location.hash.replace(/^#/, '') === nextHash) return;
    pendingTabId = tab.id;
    const url = new URL(window.location.href);
    url.hash = nextHash;
    if (type === 'push') window.history.pushState(null, '', url.href);
    else window.history.replaceState(null, '', url.href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function handleSelect(tab: WorkspaceTab): void {
    localTabsChanged = true;
    notice = '';
    navigateToTab(tab, 'push');
  }

  function handleClose(tabId: string): void {
    localTabsChanged = true;
    markLocalTabCollectionChanged();
    scrollController.cancelRestore(tabId);
    editorGuards.delete(tabId);
    editorGuardTokens.delete(tabId);
    forgetEditorInstance(tabId);
    clearDraftUiState(tabId);
    currentAdapter()?.clear({ id: tabId });
  }

  function registerEditorGuard(tabId: string, guard: (fn: () => void) => void): void {
    // 每次注册都换新 token；旧表单迟到的确认回调不能关闭同一 id 的重开标签。
    editorGuardTokens.set(tabId, Symbol(tabId));
    editorGuards.set(tabId, guard);
  }

  function setTabDirty(tabId: string, dirty: boolean): void {
    const current = tabs.find((tab) => tab.id === tabId);
    if (!current || current.dirty === dirty) return;
    tabs = tabs.map((tab) => (tab.id === tabId ? { ...tab, dirty } : tab));
  }

  function closeTabById(tabId: string): void {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    localTabsChanged = true;
    markLocalTabCollectionChanged();
    scrollController.cancelRestore(tabId);
    editorGuards.delete(tabId);
    editorGuardTokens.delete(tabId);
    forgetEditorInstance(tabId);
    clearDraftUiState(tabId);
    currentAdapter()?.clear({ id: tabId });
    const wasActive = activeTabId === tabId;
    tabs = tabs.filter((tab) => tab.id !== tabId);
    if (wasActive) {
      activeTabId = tabs[Math.min(index, tabs.length - 1)]?.id ?? '';
    }
  }

  function beforeClose(tab: WorkspaceTab): boolean {
    const descriptor = parseWorkspaceTabId(tab.id);
    if (descriptor?.kind !== 'editor') return true;
    const guard = editorGuards.get(tab.id);
    // 未注册 guard 的干净 editor 没有可保护的草稿；dirty 声明仍拒绝关闭。
    if (!guard) return tab.dirty !== true;
    const token = editorGuardTokens.get(tab.id);

    let proceeded = false;
    let guardReturned = false;
    guard(() => {
      proceeded = true;
      if (!guardReturned) return;
      if (disposed || editorGuardTokens.get(tab.id) !== token) return;
      if (!tabs.some((candidate) => candidate.id === tab.id)) return;
      closeTabById(tab.id);
    });
    guardReturned = true;
    return proceeded;
  }

  function handleCloseAll(): void {
    localTabsChanged = true;
    markLocalTabCollectionChanged();
    notice = '';
  }

  function handleLimitReached(detail: WorkspaceTabLimitReachedDetail): void {
    notice = isZh
      ? `无法打开 ${detail.tab.title}：标签上限为 ${detail.maxTabs}，且没有可安全淘汰的标签。`
      : `Unable to open ${detail.tab.title}: the tab limit is ${detail.maxTabs} and no safe tab can be evicted.`;
  }

  async function openEditor(resource: EditableResource): Promise<void> {
    const tab = createEditorTab(resource, DEFAULT_EDITOR_RECORD_ID);
    if (opening.has(tab.id) || disposed) return;
    localTabsChanged = true;
    opening.add(tab.id);
    notice = '';
    try {
      const result = await tabsRef?.openTab(tab);
      if (!result) return;
      if (result.status === 'rejected' && result.reason !== 'limit-reached') {
        notice = isZh
          ? `无法打开 ${tab.title}（${result.reason}）。`
          : `Unable to open ${tab.title} (${result.reason}).`;
      } else if (result.status === 'opened') {
        markLocalTabCollectionChanged();
        refreshPendingDrafts();
      }
    } finally {
      opening.delete(tab.id);
    }
  }

  async function openResource(resource: WorkspaceResource): Promise<void> {
    if (opening.has(resource) || disposed) return;
    localTabsChanged = true;
    opening.add(resource);
    notice = '';
    try {
      const result = await tabsRef?.openTab(createTab(resource));
      if (!result) return;
      if (result.status === 'rejected') {
        if (result.reason !== 'limit-reached') {
          notice = isZh
            ? `无法打开 ${resourceLabel(resource)}（${result.reason}）。`
            : `Unable to open ${resourceLabel(resource)} (${result.reason}).`;
        }
      } else if (result.status === 'opened') {
        markLocalTabCollectionChanged();
      }
    } finally {
      opening.delete(resource);
    }
  }

  $effect.pre(() => {
    const next = activeTabId;
    if (!next || next === previousActiveId) return;
    const previous = tabs.find((tab) => tab.id === previousActiveId);
    const current = tabs.find((tab) => tab.id === next);
    if (previous) scrollController.snapshotTab(previous);
    previousActiveId = next;
    if (current) scrollController.requestRestore(current);
  });

  $effect(() => {
    const scope = sessionScope;
    return untrack(() => {
      if (!scope) {
        tabSyncChannel?.close();
        tabSyncChannel = undefined;
        tabSyncReady += 1;
        tabSyncScope = undefined;
        pendingRemoteTabState = undefined;
        lastPublishedTabIds = undefined;
        tabSyncRevision = 0;
        lastAcceptedStateRevision = 0;
        lastAcceptedStateSenderId = tabSyncSenderId;
        return;
      }
      if (tabSyncScope === scope && tabSyncChannel) return;

      tabSyncChannel?.close();
      tabSyncChannel = undefined;
      tabSyncReady += 1;
      tabSyncScope = scope;
      pendingRemoteTabState = undefined;
      lastPublishedTabIds = undefined;
      tabSyncRevision = 0;
      lastAcceptedStateRevision = 0;
      lastAcceptedStateSenderId = tabSyncSenderId;
      if (typeof BroadcastChannel !== 'function') return;

      const channel = new BroadcastChannel(workspaceSyncChannelName(scope));
      const handleMessage = (event: MessageEvent<unknown>) => {
        if (!isRecord(event.data)) return;
        const message = event.data as Record<string, unknown>;
        if (
          message['version'] !== TAB_SYNC_VERSION
          || message['scope'] !== scope
          || message['senderId'] === tabSyncSenderId
        ) return;
        if (message['type'] === 'request') {
          postWorkspaceTabState(true);
          return;
        }
        if (message['type'] !== 'state') return;
        const revision = message['revision'];
        const senderId = message['senderId'];
        if (
          typeof revision !== 'number'
          || !Number.isInteger(revision)
          || revision < 0
          || typeof senderId !== 'string'
          || !senderId
        ) return;
        const tabIds = parseSyncTabIds(message['tabIds']);
        if (tabIds) receiveRemoteTabState(scope, revision, senderId, tabIds);
      };
      channel.addEventListener('message', handleMessage);
      tabSyncChannel = channel;
      tabSyncReady += 1;
      channel.postMessage({
        version: TAB_SYNC_VERSION,
        type: 'request',
        scope,
        senderId: tabSyncSenderId,
      } satisfies WorkspaceTabsSyncMessage);

      return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
        if (tabSyncChannel === channel) {
          tabSyncChannel = undefined;
          tabSyncReady += 1;
        }
      };
    });
  });

  $effect(() => {
    const scope = sessionScope;
    if (!scope || hydratedScope === scope) return;

    const scopeChanged = hydratedScope !== undefined;
    if (scopeChanged) localTabsChanged = false;
    const stored = readStoredWorkspaceTabs(scope);
    if (stored && (!localTabsChanged || scopeChanged)) {
      const requested = requestedTabIdFromLocation();
      const requestedActive = requested && stored.tabIds.includes(requested) ? requested : undefined;
      tabs = stored.tabIds.flatMap((id) => {
      const tab = createTabFromId(id);
        return tab ? [tab] : [];
      });
      activeTabId = requestedActive ?? stored.activeTabId ?? stored.tabIds[0] ?? '';
    } else if (!stored && scopeChanged) {
      const requested = requestedTabIdFromLocation();
      const tabIds: string[] = [...DEFAULT_RESOURCES];
      if (requested && !tabIds.includes(requested)) tabIds.push(requested);
      tabs = tabIds.flatMap((id) => {
      const tab = createTabFromId(id);
        return tab ? [tab] : [];
      });
      activeTabId = requested ?? DEFAULT_RESOURCE;
    }
    hydratedScope = scope;

    if (pendingRemoteTabState) {
      const remoteState = pendingRemoteTabState;
      pendingRemoteTabState = undefined;
      applyRemoteTabState(remoteState.tabIds);
    }

    // 初次身份 hydrate 只恢复活动标签；非活动标签的滚动位置在其被激活时恢复。
    const active = tabs.find((tab) => tab.id === activeTabId);
    if (active) scrollController.requestRestore(active);
    refreshPendingDrafts();
  });

  $effect(() => {
    const scope = sessionScope;
    const observedTabs = tabs;
    const observedActive = activeTabId;
    if (!scope || hydratedScope !== scope) return;

    const tabIds: string[] = [];
    for (const tab of observedTabs) {
      if (parseWorkspaceTabId(tab.id) && !tabIds.includes(tab.id)) tabIds.push(tab.id);
    }
    if (tabIds.length > MAX_TABS) return;
    const active = parseWorkspaceTabId(observedActive) && tabIds.includes(observedActive)
      ? observedActive
      : undefined;
    writeStoredWorkspaceTabs(scope, { tabIds, activeTabId: active });
  });

  $effect(() => {
    void sessionScope;
    void hydratedScope;
    void tabSyncReady;
    void tabSyncLocalMutation;
    untrack(() => postWorkspaceTabState());
  });

  $effect(() => {
    if (parsed.resourcePath !== 'workspace') return;
    if (tabs.length !== 0 || activeTabId !== '') return;
    replaceWithEmptyWorkspace();
  });

  $effect(() => {
    if (parsed.resourcePath !== 'workspace') return;
    const requested = parsed.params['tab'];

    if (pendingTabId !== undefined) {
      if (requested === pendingTabId) pendingTabId = undefined;
      else return;
    }

    if (tabs.length === 0) {
      if (requested !== undefined) replaceWithEmptyWorkspace();
      return;
    }

    const fallback = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
    if (!requested) {
      navigateToTab(fallback, 'replace');
      return;
    }

    const existing = tabs.find((tab) => tab.id === requested);
    if (existing) {
      if (activeTabId !== existing.id) activeTabId = existing.id;
      return;
    }

    // 关闭/淘汰后的历史 URL 不复活已移除标签，只回到当前允许的活动标签。
    if (fallback) navigateToTab(fallback, 'replace');
  });
</script>

<WorkspaceTabsView
  bind:root
  bind:tabs
  bind:activeTabId
  bind:tabsRef
  bind:editorInstances
  {notice}
  {isZh}
  {hydratedScope}
  {sessionScope}
  {pendingDrafts}
  {resourceLabel}
  onOpenResource={(resource) => void openResource(resource)}
  onOpenEditor={() => void openEditor('crm_accounts')}
  onSelect={handleSelect}
  onClose={handleClose}
  onBeforeClose={beforeClose}
  onCloseAll={handleCloseAll}
  onTabLimitReached={handleLimitReached}
  {readTabListState}
  {persistTabListState}
  {confirmDraft}
  {discardDraft}
  {persistEditorDraft}
  {handleEditorSaved}
  {setTabDirty}
  {registerEditorGuard}
  {closeTabById}
/>
