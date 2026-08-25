<script lang="ts">
  import WorkspaceActionBar from './content/WorkspaceActionBar.svelte';
  import WorkspaceInspector from './content/WorkspaceInspector.svelte';
  import WorkspaceLayout from './content/WorkspaceLayout.svelte';
  import WorkspaceSplitPane from './content/WorkspaceSplitPane.svelte';
  import WorkspaceStageStepper, { type WorkspaceStage } from './content/WorkspaceStageStepper.svelte';
  import { Button } from './ui/button/index.js';

  const stages: WorkspaceStage[] = [
    { id: 'intake', label: 'Intake', status: 'complete' },
    { id: 'execution', label: 'Execution', status: 'current' },
    { id: 'report', label: 'Report', status: 'pending' },
  ];

  let activeId = $state('execution');
  let inspectorOpen = $state(true);
  let actionCount = $state(0);
</script>

{#snippet summary()}
  <WorkspaceStageStepper {stages} {activeId} onselect={(stage) => { activeId = stage.id; }} />
{/snippet}

{#snippet primaryAction()}
  <Button size="sm" onclick={() => { actionCount += 1; }}>Advance</Button>
{/snippet}

{#snippet primary()}
  <WorkspaceActionBar title="Next action" {primaryAction} />
  <p data-action-count>{actionCount}</p>
  <WorkspaceSplitPane>
    {#snippet primary()}<p>Primary pane</p>{/snippet}
    {#snippet secondary()}<p>Secondary pane</p>{/snippet}
  </WorkspaceSplitPane>
{/snippet}

{#snippet secondary()}
  <WorkspaceInspector title="Context" open={inspectorOpen} ontoggle={(open) => { inspectorOpen = open; }}>
    <p>Inspector content</p>
  </WorkspaceInspector>
{/snippet}

<WorkspaceLayout {summary} {primary} {secondary} secondaryCollapsed={!inspectorOpen} />
