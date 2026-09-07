<script module lang="ts">
  export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'success' | 'warning' | 'error' | 'neutral';
  export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg';
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    src?: string | null | undefined;
    name?: string | null | undefined;
    subtitle?: string | null | undefined;
    status?: AvatarStatus;
    size?: AvatarSize;
    shape?: 'circle' | 'square';
    showName?: boolean;
    nullLabel?: string;
    class?: string;
  }

  let {
    src,
    name,
    subtitle,
    status,
    size = 'sm',
    shape = 'circle',
    showName = false,
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  let imgError = $state(false);

  $effect(() => {
    void src;
    imgError = false;
  });

  const sizeClasses: Record<AvatarSize, { container: string; text: string; dot: string }> = {
    xs: { container: 'svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e', text: 'svadmin-u-1dc571a3609f', dot: 'svadmin-u-095acb275581 svadmin-u-c696a0890973' },
    sm: { container: 'svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828', text: 'svadmin-u-359090c2d529', dot: 'svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9' },
    default: { container: 'svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f', text: 'svadmin-u-fc7473ca09eb', dot: 'svadmin-u-9b3d0721b628 svadmin-u-650758f4572a' },
    lg: { container: 'svadmin-u-f82f0c255ad9 svadmin-u-edaba517866e', text: 'svadmin-u-4ee734926ff6', dot: 'svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29' },
  };

  const statusColors: Record<AvatarStatus, string> = {
    online: 'svadmin-u-3355648fe22b',
    success: 'bg-success',
    busy: 'bg-destructive',
    error: 'bg-destructive',
    warning: 'bg-warning',
    away: 'bg-warning',
    offline: 'bg-muted-foreground',
    neutral: 'bg-muted-foreground',
  };

  function getInitials(value?: string | null): string {
    const trimmed = value?.trim();
    if (!trimmed) return '?';

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  const initials = $derived(getInitials(name));
  const hasContent = $derived(Boolean(src || name?.trim()));
</script>

{#if !hasContent}
  <span class={cn('field-avatar svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-avatar svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3', className)}>
    <div class="svadmin-u-d89972fe17d6 svadmin-u-bb0c4bfc52bd svadmin-u-012fbd121f37">
      <div
        class={cn(
          'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-2cd02d11d1af svadmin-u-2ef11f1cb219 svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-7f6912283f11',
          shape === 'circle' ? 'svadmin-u-ac204c108886' : 'svadmin-u-421ac2be5045',
          sizeClasses[size].container,
          sizeClasses[size].text
        )}
      >
        {#if src && !imgError}
          <img
            {src}
            alt={name?.trim() || 'Avatar'}
            class="svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-7d85d0c21a32"
            onerror={() => { imgError = true; }}
          />
        {:else}
          <span>{initials}</span>
        {/if}
      </div>

      {#if status}
        <span
          class={cn(
            'svadmin-u-da4dbfbc4fdc svadmin-u-189f036c335c svadmin-u-d8cdcad240d1 svadmin-u-ac204c108886 svadmin-u-16b1efa5875e svadmin-u-85399de17097',
            statusColors[status],
            sizeClasses[size].dot
          )}
          role="img"
          aria-label={`Status: ${status}`}
          title={`Status: ${status}`}
        ></span>
      {/if}
    </div>

    {#if showName && (name || subtitle)}
      <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-7e0b7cdf1a94 svadmin-u-2eba0d65d059">
        {#if name}
          <span class="svadmin-u-f283ea9bea0e svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-e9fadafbd4a2">{name}</span>
        {/if}
        {#if subtitle}
          <span class="svadmin-u-f283ea9bea0e svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-e9fadafbd4a2">{subtitle}</span>
        {/if}
      </div>
    {/if}
  </div>
{/if}
