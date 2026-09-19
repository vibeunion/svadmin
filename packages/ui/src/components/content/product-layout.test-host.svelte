<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import SectionHeader from './SectionHeader.svelte';
  import PageToolbar from './PageToolbar.svelte';
  import WorkspaceLayout from './WorkspaceLayout.svelte';
  import SettingsGroup from './SettingsGroup.svelte';
  import SettingsFieldRow from './SettingsFieldRow.svelte';
  let { secondary = true, order = 'primary-first', collapsed = false }: { secondary?: boolean; order?: 'primary-first' | 'secondary-first'; collapsed?: boolean } = $props();
  let count = $state(0);
</script>
{#snippet primary()}<p data-testid="primary">Primary {count}</p>{/snippet}
{#snippet aside()}<p data-testid="secondary">Secondary</p>{/snippet}
{#snippet summary()}<p data-testid="summary">Summary</p>{/snippet}
<WorkspaceLayout {primary} {summary} {...definedOptions({ secondary: secondary ? aside : undefined })} mobileOrder={order} secondaryCollapsed={collapsed} secondaryWidth="20rem" secondaryCollapsedWidth="4rem" class="consumer-layout" />
<SectionHeader id="section-label" title="Settings" description="Explanation" class="consumer-heading">
  {#snippet actions()}<button onclick={() => count++}>Header action</button>{/snippet}
</SectionHeader>
<PageToolbar class="consumer-toolbar">
  {#snippet leading()}<span>Leading</span>{/snippet}<span>Body</span>
  {#snippet trailing()}<button onclick={() => count++}>Trailing action</button>{/snippet}
</PageToolbar>
<SettingsGroup title="General" description="Description" class="consumer-group" bodyClass="consumer-body">
  {#snippet actions()}<button onclick={() => count++}>Group action</button>{/snippet}
  <SettingsFieldRow label="Name" description="Field description" separated={collapsed} class="consumer-row">
    {#snippet control()}<input aria-label="Name" value="Preserved" />{/snippet}
  </SettingsFieldRow>
</SettingsGroup>
