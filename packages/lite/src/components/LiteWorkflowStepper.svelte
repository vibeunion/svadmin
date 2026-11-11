<script lang="ts">
  export interface LiteWorkflowNode {
    id: string;
    label: string;
    status: 'completed' | 'running' | 'failed' | 'pending';
    durationText?: string;
  }

  interface Props {
    nodes: LiteWorkflowNode[];
    title?: string;
    class?: string;
  }

  let {
    nodes = [],
    title = 'Workflow Execution',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-workflow-stepper {className}"
  data-svadmin-component="LiteWorkflowStepper"
>
  <h4 class="lite-workflow-title">{title}</h4>
  <ol class="lite-workflow-list">
    {#each nodes as node (node.id)}
      <li class="lite-workflow-node lite-status-{node.status}">
        <span class="lite-node-icon">
          {#if node.status === 'completed'}✓{:else if node.status === 'running'}⏳{:else if node.status === 'failed'}✕{:else}○{/if}
        </span>
        <span class="lite-node-label">{node.label}</span>
        {#if node.durationText}
          <span class="lite-node-duration">{node.durationText}</span>
        {/if}
      </li>
    {/each}
  </ol>
</div>

<style>
  .lite-workflow-stepper { border: 1px solid #e5e6eb; border-radius: 8px; background: #ffffff; padding: 16px; }
  .lite-workflow-title { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: #1d2129; }
  .lite-workflow-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .lite-workflow-list > * + * { margin-top: 8px; }
  .lite-workflow-node { display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; border: 1px solid #f2f3f5; font-size: 12px; }
  .lite-workflow-node > * + * { margin-left: 10px; }
  .lite-node-icon { font-weight: 700; width: 18px; text-align: center; }
  .lite-status-completed { background: #e8ffea; color: #00b42a; border-color: #aff0b5; }
  .lite-status-running { background: #e8f3ff; color: #165dff; border-color: #b3d6ff; }
  .lite-status-failed { background: #ffece8; color: #f53f3f; border-color: #fbbbb0; }
  .lite-status-pending { background: #f7f8fa; color: #86909c; }
  .lite-node-label { font-weight: 500; flex: 1; }
  .lite-node-duration { font-family: monospace; font-size: 11px; color: #86909c; }
</style>
