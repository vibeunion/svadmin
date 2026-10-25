<script lang="ts">
  import MultiTabKeepAlive, { type WorkspaceTab } from './MultiTabKeepAlive.svelte';

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
    onclose?: (tabId: string) => void;
    oncloseall?: () => void;
    onbeforeclose?: (tab: WorkspaceTab) => boolean | Promise<boolean>;
  }

  let {
    tabs: initialTabs = [],
    activeTabId: initialActiveTabId = '',
    onclose,
    oncloseall,
    onbeforeclose,
  }: Props = $props();

  // 宿主拥有本地状态，用于外部观察组件写回的 activeTabId 与标签数量。
  // svelte-ignore state_referenced_locally
  let tabs = $state<WorkspaceTab[]>(initialTabs);
  // svelte-ignore state_referenced_locally
  let activeTabId = $state(initialActiveTabId);
</script>

<div
  data-testid="tab-state"
  data-active-tab={activeTabId}
  data-tab-count={tabs.length}
  data-tab-ids={tabs.map((tab) => tab.id).join(',')}
></div>
<MultiTabKeepAlive bind:tabs bind:activeTabId {onclose} {oncloseall} {onbeforeclose} />