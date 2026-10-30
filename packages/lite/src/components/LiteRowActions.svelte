<script lang="ts">
  interface RowAction {
    id: string;
    label: string;
    href?: string;
    action?: string;
    method?: string;
    danger?: boolean;
    disabled?: boolean;
  }

  interface Props {
    actions: RowAction[];
    label?: string;
  }

  let { actions, label = 'Row actions' }: Props = $props();
</script>

<div class="lite-inline-xs" role="group" aria-label={label}>
  {#each actions as action (action.id)}
    {#if action.disabled}
      <span class="lite-btn lite-btn-sm" aria-disabled="true">{action.label}</span>
    {:else if action.href}
      <a class="lite-btn lite-btn-sm" class:lite-btn-danger={action.danger} href={action.href}>{action.label}</a>
    {:else if action.action}
      <form method={action.method ?? 'POST'} action={action.action}>
        <button class="lite-btn lite-btn-sm" class:lite-btn-danger={action.danger} type="submit">{action.label}</button>
      </form>
    {:else}
      <span class="lite-muted">{action.label}</span>
    {/if}
  {/each}
</div>
