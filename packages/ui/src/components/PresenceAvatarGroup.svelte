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
        return 'svadmin-u-a486cacb3a15 svadmin-u-8e7bba3352f0 svadmin-u-d59b97947485';
      case 'idle':
        return 'svadmin-u-43ed7af3fc8a svadmin-u-ffe6499f370c';
      default:
        return 'svadmin-u-3355648fe22b svadmin-u-0a0bdc193a65';
    }
  }
</script>

<div class={cn('svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-359090c2d529 svadmin-u-7f6912283f11', className)}>
  {#if label}
    <span class="svadmin-u-bfa603190748 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
      <Users class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      {label}:
    </span>
  {/if}

  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-9f6ccfe3205a svadmin-u-2cd02d11d1af svadmin-u-660d2effb880">
    {#each visibleUsers as user (user.id)}
      <div
        class="svadmin-u-d89972fe17d6 svadmin-u-52083e7da442 svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-65935df577ba svadmin-u-4c1e8d12f3db svadmin-u-2ef11f1cb219 svadmin-u-d058ca6de60f svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-cef5b893cf23 svadmin-u-eadef238231e svadmin-u-d5254d26307d svadmin-u-7abf679f0725"
        title="{user.name} ({user.status ?? 'online'})"
      >
        {#if user.avatar}
          <img src={user.avatar} alt={user.name} class="svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-ac204c108886 svadmin-u-7d85d0c21a32" />
        {:else}
          <span>{getInitials(user.name)}</span>
        {/if}

        <!-- Status Dot Indicator -->
        <span
          class={cn(
            'svadmin-u-da4dbfbc4fdc svadmin-u-189f036c335c svadmin-u-d8cdcad240d1 svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9 svadmin-u-ac204c108886 svadmin-u-16b1efa5875e svadmin-u-85399de17097',
            getStatusIndicator(user.status)
          )}
        ></span>
      </div>
    {/each}

    {#if hiddenCount > 0}
      <div
        class="svadmin-u-d89972fe17d6 svadmin-u-52083e7da442 svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-65935df577ba svadmin-u-4c1e8d12f3db svadmin-u-ba939ea82d8b svadmin-u-1dc571a3609f svadmin-u-2689f3958069 svadmin-u-5064267f78e3 svadmin-u-cef5b893cf23"
        title="{hiddenCount} more users"
      >
        +{hiddenCount}
      </div>
    {/if}
  </div>
</div>
