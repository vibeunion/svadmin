<script lang="ts">
  import { Users } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface PresenceUser {
    id: string;
    name: string;
    avatar?: string;
    status?: 'online' | 'idle' | 'editing';
  }

  interface Props {
    users?: PresenceUser[];
    maxVisible?: number;
    label?: string;
    class?: string;
  }

  let {
    users = [],
    maxVisible = 4,
    label = 'Viewing now',
    class: className = '',
  }: Props = $props();

  const visibleUsers = $derived(users.slice(0, maxVisible));
  const hiddenCount = $derived(Math.max(0, users.length - maxVisible));

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getStatusIndicator(status?: PresenceUser['status']) {
    switch (status) {
      case 'editing':
        return 'bg-warning ring-warning/30 animate-pulse';
      case 'idle':
        return 'bg-muted-foreground ring-muted-foreground/30';
      default:
        return 'bg-success ring-success/30';
    }
  }
</script>

<div class={cn('inline-flex items-center gap-2 text-xs select-none', className)}>
  {#if label}
    <span class="text-muted-foreground flex items-center gap-1">
      <Users class="h-3.5 w-3.5" />
      {label}:
    </span>
  {/if}

  <div class="flex items-center -space-x-2 overflow-hidden py-1">
    {#each visibleUsers as user (user.id)}
      <div
        class="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-[11px] font-semibold text-foreground shadow-xs transition-transform hover:z-10 hover:scale-110"
        title="{user.name} ({user.status ?? 'online'})"
      >
        {#if user.avatar}
          <img src={user.avatar} alt={user.name} class="h-full w-full rounded-full object-cover" />
        {:else}
          <span>{getInitials(user.name)}</span>
        {/if}

        <!-- Status Dot Indicator -->
        <span
          class={cn(
            'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-background',
            getStatusIndicator(user.status)
          )}
        ></span>
      </div>
    {/each}

    {#if hiddenCount > 0}
      <div
        class="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-secondary text-[10px] font-medium text-secondary-foreground shadow-xs"
        title="{hiddenCount} more users"
      >
        +{hiddenCount}
      </div>
    {/if}
  </div>
</div>
