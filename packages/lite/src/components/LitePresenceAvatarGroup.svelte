<script lang="ts">
  interface LitePresenceUser {
    id: string;
    name: string;
    status?: 'online' | 'idle' | 'editing';
  }

  interface Props {
    users?: LitePresenceUser[];
    label?: string;
  }

  let {
    users = [],
    label = 'Viewing now',
  }: Props = $props();
</script>

<div class="lite-presence-container">
  <span class="lite-presence-label">{label}:</span>
  {#each users as user (user.id)}
    <span class="lite-presence-badge" title="{user.name} ({user.status ?? 'online'})">
      👤 {user.name}
    </span>
  {/each}
  {#if users.length === 0}
    <span style="color: #86909C; font-size: 11px;">No active viewers</span>
  {/if}
</div>

<style>
  .lite-presence-container {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .lite-presence-label {
    color: #4E5969;
    margin-right: 6px;
    font-weight: 500;
  }
  .lite-presence-badge {
    display: inline-block;
    padding: 2px 6px;
    background: #F2F3F5;
    border: 1px solid #E5E6EB;
    border-radius: 4px;
    margin-right: 4px;
    font-size: 11px;
  }
</style>
