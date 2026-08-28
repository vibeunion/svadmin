<script lang="ts">
  export interface PendingMutation {
    id: string;
    action: string;
    resource: string;
    timestamp: string;
  }

  interface Props {
    isOnline?: boolean;
    pendingMutations?: PendingMutation[];
    formAction?: string;
    class?: string;
  }

  let {
    isOnline = true,
    pendingMutations = [],
    formAction = '',
    class: className = '',
  }: Props = $props();
</script>

{#if !isOnline || pendingMutations.length > 0}
  <div class="sv-lite-sync-banner {isOnline ? 'sv-lite-sync-online' : 'sv-lite-sync-offline'} {className}">
    <div class="sv-lite-sync-title">
      {#if !isOnline}
        <strong>Offline Connection:</strong> Changes are buffered locally.
      {:else}
        <strong>Online Connection:</strong> {pendingMutations.length} pending local mutations.
      {/if}
    </div>

    {#if pendingMutations.length > 0 && formAction}
      <form method="POST" action={formAction} class="sv-lite-sync-form">
        <button type="submit" class="sv-lite-sync-btn">Force Sync All ({pendingMutations.length})</button>
      </form>
    {/if}
  </div>
{/if}

<style>
  .sv-lite-sync-banner {
    display: block;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 10px;
  }
  .sv-lite-sync-offline {
    background-color: #fef3c7;
    border: 1px solid #fde68a;
    color: #92400e;
  }
  .sv-lite-sync-online {
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  .sv-lite-sync-title {
    display: inline-block;
  }
  .sv-lite-sync-form {
    float: right;
  }
  .sv-lite-sync-btn {
    padding: 3px 8px;
    font-size: 11px;
    background-color: #4f46e5;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
</style>
