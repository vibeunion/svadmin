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
    xs: { container: 'h-5 w-5', text: 'text-[10px]', dot: 'h-1.5 w-1.5' },
    sm: { container: 'h-7 w-7', text: 'text-xs', dot: 'h-2 w-2' },
    default: { container: 'h-9 w-9', text: 'text-sm', dot: 'h-2.5 w-2.5' },
    lg: { container: 'h-11 w-11', text: 'text-base', dot: 'h-3 w-3' },
  };

  const statusColors: Record<AvatarStatus, string> = {
    online: 'bg-emerald-500',
    success: 'bg-emerald-500',
    busy: 'bg-rose-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-400',
    neutral: 'bg-slate-400',
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
  <span class={cn('field-avatar text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-avatar inline-flex items-center gap-2.5', className)}>
    <div class="relative inline-block shrink-0">
      <div
        class={cn(
          'flex items-center justify-center overflow-hidden bg-muted font-medium text-muted-foreground select-none',
          shape === 'circle' ? 'rounded-full' : 'rounded-md',
          sizeClasses[size].container,
          sizeClasses[size].text
        )}
      >
        {#if src && !imgError}
          <img
            {src}
            alt={name?.trim() || 'Avatar'}
            class="h-full w-full object-cover"
            onerror={() => { imgError = true; }}
          />
        {:else}
          <span>{initials}</span>
        {/if}
      </div>

      {#if status}
        <span
          class={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
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
      <div class="flex flex-col min-w-0 text-left">
        {#if name}
          <span class="truncate text-xs font-medium text-foreground leading-tight">{name}</span>
        {/if}
        {#if subtitle}
          <span class="truncate text-[11px] text-muted-foreground leading-tight">{subtitle}</span>
        {/if}
      </div>
    {/if}
  </div>
{/if}
