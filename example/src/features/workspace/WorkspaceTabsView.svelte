<script lang="ts">
  import { Pencil, Plus } from '@lucide/svelte';
  import AutoTable from '@svadmin/ui/components/AutoTable.svelte';
  import ContentPageHeader from '@svadmin/ui/components/content/ContentPageHeader.svelte';
  import ContentPageShell from '@svadmin/ui/components/content/ContentPageShell.svelte';
  import MultiTabKeepAlive, {
    type WorkspaceTab,
    type WorkspaceTabLimitReachedDetail,
    type WorkspaceTabOpenResult,
  } from '@svadmin/ui/components/MultiTabKeepAlive.svelte';
  import { Button } from '@svadmin/ui/components/ui/button/index.js';
  import type { ListStateSnapshot } from '@svadmin/ui';
  import WorkspaceResourceEditor from './WorkspaceResourceEditor.svelte';
  import {
    draftFieldKeys,
    MAX_TABS,
    parseWorkspaceTabId,
    type EditableResource,
    type WorkspaceResource,
  } from './workspace-tabs-model';

  interface WorkspaceDraftEditorHandle {
    restoreDraft(candidate: Record<string, unknown>): boolean;
    cancelDraftRestore(): void;
    getDraftToken(): symbol;
  }

  interface PendingWorkspaceDraft {
    data: Record<string, unknown>;
  }

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
    notice: string;
    isZh: boolean;
    hydratedScope: string | undefined;
    sessionScope: string | undefined;
    pendingDrafts: Record<string, PendingWorkspaceDraft>;
    editorInstances?: Record<string, WorkspaceDraftEditorHandle | null | undefined> | undefined;
    root?: HTMLDivElement | undefined;
    tabsRef?: { openTab: (tab: WorkspaceTab) => Promise<WorkspaceTabOpenResult> } | undefined;
    resourceLabel: (resource: WorkspaceResource | EditableResource) => string;
    onOpenResource: (resource: WorkspaceResource) => void;
    onOpenEditor: () => void;
    onSelect: (tab: WorkspaceTab) => void;
    onClose: (tabId: string) => void;
    onBeforeClose: (tab: WorkspaceTab) => boolean;
    onCloseAll: () => void;
    onTabLimitReached: (detail: WorkspaceTabLimitReachedDetail) => void;
    readTabListState: (tab: WorkspaceTab) => ListStateSnapshot | undefined;
    persistTabListState: (tab: WorkspaceTab, snapshot: ListStateSnapshot) => void;
    confirmDraft: (tab: WorkspaceTab) => void;
    discardDraft: (tab: WorkspaceTab) => void;
    persistEditorDraft: (
      tab: WorkspaceTab,
      draft: Record<string, unknown> | undefined,
      token: symbol,
    ) => void;
    handleEditorSaved: (tabId: string) => void;
    setTabDirty: (tabId: string, dirty: boolean) => void;
    registerEditorGuard: (tabId: string, guard: (fn: () => void) => void) => void;
    closeTabById: (tabId: string) => void;
  }

  let {
    tabs = $bindable([]),
    activeTabId = $bindable(''),
    notice,
    isZh,
    hydratedScope,
    sessionScope,
    pendingDrafts,
    editorInstances = $bindable({}),
    root = $bindable(),
    tabsRef = $bindable(),
    resourceLabel,
    onOpenResource,
    onOpenEditor,
    onSelect,
    onClose,
    onBeforeClose,
    onCloseAll,
    onTabLimitReached,
    readTabListState,
    persistTabListState,
    confirmDraft,
    discardDraft,
    persistEditorDraft,
    handleEditorSaved,
    setTabDirty,
    registerEditorGuard,
    closeTabById,
  }: Props = $props();
</script>

<div
  class="workspace-tabs"
  bind:this={root}
  data-app-page="workspace-tabs"
  data-workspace-active-tab={activeTabId}
  data-workspace-dirty-tabs={tabs.filter((tab) => tab.dirty === true).map((tab) => tab.id).join(',')}
>
  <ContentPageShell pageId="workspace-tabs" width="wide">
    <ContentPageHeader title={isZh ? '运营多标签工作区' : 'Operations multi-tab workspace'} />

    <div class="workspace-tabs__toolbar" aria-label={isZh ? '打开资源标签' : 'Open resource tabs'}>
      <span class="workspace-tabs__toolbar-label">{isZh ? '打开资源' : 'Open resource'}</span>
      {#each ['crm_accounts', 'crm_contacts', 'crm_deals', 'crm_activities'] as resource (`open-${resource}`)}
        <Button
          size="sm"
          variant="outline"
          data-open-workspace-resource={resource}
          onclick={() => onOpenResource(resource as WorkspaceResource)}
        >
          <Plus aria-hidden="true" class="workspace-tabs__add-icon" />
          {resourceLabel(resource as WorkspaceResource)}
        </Button>
      {/each}
      <Button size="sm" variant="outline" data-open-workspace-editor="crm_accounts" onclick={onOpenEditor}>
        <Pencil aria-hidden="true" class="workspace-tabs__add-icon" />
        {isZh ? '编辑示例客户' : 'Edit demo account'}
      </Button>
    </div>

    <MultiTabKeepAlive
      bind:this={tabsRef}
      bind:tabs
      bind:activeTabId
      maxTabs={MAX_TABS}
      onselect={onSelect}
      onclose={onClose}
      onbeforeclose={onBeforeClose}
      oncloseall={onCloseAll}
      onTabLimitReached={onTabLimitReached}
    />

    {#if notice}<p class="workspace-tabs__notice" role="status">{notice}</p>{/if}

    {#if tabs.length === 0}
      <div class="workspace-tabs__empty" data-workspace-empty="true">
        <p>{isZh ? '当前没有打开的标签。' : 'No tabs are open.'}</p>
      </div>
    {:else}
      <div class="workspace-tabs__panes">
        {#each tabs as tab (tab.id)}
          {@const descriptor = parseWorkspaceTabId(tab.id)}
          <section
            class="workspace-tabs__pane"
            data-workspace-pane={tab.id}
            aria-label={tab.title}
            hidden={tab.id !== activeTabId}
          >
            <div class="workspace-tabs__scroll" data-workspace-scroll={tab.id}>
              {#if descriptor?.kind === 'list'}
                {#key `${tab.id}:${hydratedScope ?? 'pending'}`}
                  <AutoTable
                    resourceName={descriptor.resource}
                    title={tab.title}
                    syncWithLocation={false}
                    selectable={false}
                    initialListState={readTabListState(tab)}
                    onListStateChange={(state) => persistTabListState(tab, state)}
                  />
                {/key}
              {:else if descriptor?.kind === 'editor'}
                {#key `${tab.id}:${sessionScope ?? 'anonymous'}`}
                  {#if pendingDrafts[tab.id]}
                    <div class="workspace-tabs__notice" role="status" data-workspace-draft-prompt={tab.id}>
                      <span>
                        {isZh
                          ? '检测到该记录有未保存的草稿。确认后才写入当前表单。'
                          : 'An unsaved draft was found for this record. It is applied only after you confirm.'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        data-workspace-draft-restore={tab.id}
                        onclick={() => confirmDraft(tab)}
                      >
                        {isZh ? '恢复草稿' : 'Restore draft'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-workspace-draft-discard={tab.id}
                        onclick={() => discardDraft(tab)}
                      >
                        {isZh ? '丢弃草稿' : 'Discard draft'}
                      </Button>
                    </div>
                  {/if}
                  <WorkspaceResourceEditor
                    bind:this={editorInstances[tab.id]}
                    resourceName={descriptor.resource}
                    recordId={descriptor.recordId}
                    draftFields={draftFieldKeys(descriptor.resource)}
                    onDraftChange={(draft, token) => persistEditorDraft(tab, draft, token)}
                    onSaved={() => handleEditorSaved(tab.id)}
                    onDirtyChange={(dirty) => setTabDirty(tab.id, dirty)}
                    onNavigationGuardReady={(guard) => registerEditorGuard(tab.id, guard)}
                    onCancel={() => closeTabById(tab.id)}
                  />
                {/key}
              {:else}
                <p class="workspace-tabs__note">
                  {isZh ? '该标签没有可用的资源表。' : 'No resource table is available for this tab.'}
                </p>
              {/if}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </ContentPageShell>
</div>
