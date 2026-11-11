<script lang="ts">
  export interface LitePresenceUser {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    status?: 'online' | 'viewing' | 'idle' | 'editing';
  }

  interface Props {
    users?: LitePresenceUser[];
    label?: string;
    maxVisible?: number;
    maxCount?: number;
    size?: 'sm' | 'md' | 'lg';
    showStatusDot?: boolean;
    class?: string;
  }

  let {
    users = [],
    label = 'Viewing now',
    maxVisible,
    maxCount,
    size = 'md',
    showStatusDot = true,
    class: className = '',
  }: Props = $props();

  const limit = $derived(Math.max(0, maxVisible ?? maxCount ?? 4));
  const visible = $derived(users.slice(0, limit));
  const hidden = $derived(users.slice(limit));

  function initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }

  function statusLabel(status: LitePresenceUser['status']): string {
    return status ?? 'online';
  }
</script>

<div class="lite-presence-container lite-presence-{size} {className}">
  <span class="lite-presence-label">{label}:</span>

  {#each visible as user (user.id)}
    <span
      class="lite-presence-badge"
      title={`${user.name}${user.role ? ` (${user.role})` : ''} · ${statusLabel(user.status)}`}
      data-presence-user={user.id}
      data-status={statusLabel(user.status)}
    >
      {#if user.avatar}
        <img src={user.avatar} alt="" class="lite-presence-avatar" />
      {:else}
        <span class="lite-presence-initials" aria-hidden="true">{initials(user.name)}</span>
      {/if}
      <span class="lite-presence-name">{user.name}</span>
      {#if showStatusDot && user.status}
        <span class="lite-presence-dot" aria-hidden="true"></span>
      {/if}
    </span>
  {/each}

  {#if hidden.length > 0}
    <span
      class="lite-presence-overflow"
      title={hidden.map((user) => user.name).join(', ')}
      aria-label={`+${hidden.length} more users`}
    >
      +{hidden.length}
    </span>
  {/if}

  {#if users.length === 0}
    <span class="lite-presence-empty">No active viewers</span>
  {/if}
</div>

<style>
  .lite-presence-container {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .lite-presence-label {
    color: #4e5969;
    margin-right: 2px;
    font-weight: 500;
  }
  .lite-presence-badge {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 2px 6px 2px 3px;
    background: #f2f3f5;
    border: 1px solid #e5e6eb;
    border-radius: 999px;
    margin-right: 2px;
    font-size: 11px;
    line-height: 1.4;
  }
  .lite-presence-avatar,
  .lite-presence-initials {
    display: inline-block;
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    margin-right: 4px;
    border-radius: 999px;
    text-align: center;
    line-height: 20px;
    object-fit: cover;
    background: #e8f3ff;
    color: #165dff;
    font-size: 9px;
    font-weight: 700;
  }
  .lite-presence-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lite-presence-dot {
    margin-left: 4px;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #00b42a;
    box-shadow: 0 0 0 1px #fff;
  }
  .lite-presence-badge[data-status='idle'] .lite-presence-dot { background: #86909c; }
  .lite-presence-badge[data-status='editing'] .lite-presence-dot { background: #ff7d00; }
  .lite-presence-badge[data-status='viewing'] .lite-presence-dot { background: #00b42a; }
  .lite-presence-overflow {
    display: inline-block;
    min-width: 24px;
    line-height: 24px;
    text-align: center;
    height: 24px;
    padding: 0 5px;
    border: 1px solid #e5e6eb;
    border-radius: 999px;
    background: #fff;
    color: #4e5969;
    font-size: 11px;
    font-weight: 600;
  }
  .lite-presence-empty { color: #86909c; font-size: 11px; }
  .lite-presence-sm .lite-presence-avatar,
  .lite-presence-sm .lite-presence-initials { width: 16px; height: 16px; flex-basis: 16px; font-size: 8px; }
  .lite-presence-lg .lite-presence-avatar,
  .lite-presence-lg .lite-presence-initials { width: 26px; height: 26px; flex-basis: 26px; font-size: 10px; }
</style>
