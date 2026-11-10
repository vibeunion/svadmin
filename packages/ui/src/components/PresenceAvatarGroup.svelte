<script lang="ts">
  import { Users } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface PresenceUser {
    id: string;
    name: string;
    avatar?: string | undefined;
    role?: string | undefined;
    status?: 'online' | 'viewing' | 'editing' | 'idle' | undefined;
    lastActive?: string | number | undefined;
  }

  export interface PresenceAvatarGroupProps {
    users?: PresenceUser[] | undefined;
    maxVisible?: number | undefined;
    maxCount?: number | undefined;
    label?: string | undefined;
    size?: 'sm' | 'md' | 'lg' | undefined;
    showStatusDot?: boolean | undefined;
    class?: string | undefined;
    onuserclick?: ((user: PresenceUser) => void) | undefined;
  }

  let {
    users = [],
    maxVisible,
    maxCount,
    label,
    size = 'md',
    showStatusDot = true,
    class: className = '',
    onuserclick,
  }: PresenceAvatarGroupProps = $props();

  const effectiveMax = $derived(maxVisible ?? maxCount ?? 4);
  const visibleUsers = $derived(users.slice(0, effectiveMax));
  const hiddenCount = $derived(Math.max(0, users.length - effectiveMax));
  const hiddenUsers = $derived(users.slice(effectiveMax));

  const sizeMap = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  };

  const dotSizeMap = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || (name.trim().charAt(0) || 'U').toUpperCase();
  }

  function getStatusIndicator(status?: PresenceUser['status']) {
    switch (status) {
      case 'editing':
        return 'bg-warning ring-warning/30';
      case 'idle':
        return 'bg-muted-foreground ring-muted-foreground/30';
      case 'viewing':
      case 'online':
      default:
        return 'bg-success ring-success/30';
    }
  }
</script>

<div
  class={cn('inline-flex items-center gap-2 text-xs select-none', className)}
  data-svadmin-component="PresenceAvatarGroup"
>
  {#if label}
    <span class="text-muted-foreground flex items-center gap-1 font-medium">
      <Users class="h-3.5 w-3.5" />
      {label}:
    </span>
  {/if}

  <div class="flex items-center -space-x-2 overflow-visible py-1">
    {#each visibleUsers as user (user.id)}
      {@const tooltip = `${user.name}${user.role ? ` (${user.role})` : ''} · ${user.status ?? 'online'}`}
      <button
        type="button"
        class={cn(
          'relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-semibold text-foreground shadow-xs transition-all hover:z-20 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary',
          sizeMap[size]
        )}
        title={tooltip}
        aria-label={tooltip}
        onclick={() => onuserclick?.(user)}
        data-svadmin-presence-user={user.id}
      >
        {#if user.avatar}
          <img src={user.avatar} alt={user.name} class="h-full w-full rounded-full object-cover" />
        {:else}
          <span>{getInitials(user.name)}</span>
        {/if}

        <!-- Status Dot Indicator -->
        {#if showStatusDot && user.status}
          <span
            class={cn(
              'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
              dotSizeMap[size],
              getStatusIndicator(user.status)
            )}
          >
            {#if user.status === 'editing'}
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75"></span>
            {/if}
          </span>
        {/if}
      </button>
    {/each}

    {#if hiddenCount > 0}
      <div
        class={cn(
          'relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-background bg-secondary font-medium text-secondary-foreground shadow-xs transition-transform hover:scale-105',
          sizeMap[size]
        )}
        title={hiddenUsers.map((u) => u.name).join(', ')}
        aria-label={`+${hiddenCount} more users`}
        data-svadmin-presence-overflow={hiddenCount}
      >
        +{hiddenCount}
      </div>
    {/if}
  </div>
</div>
