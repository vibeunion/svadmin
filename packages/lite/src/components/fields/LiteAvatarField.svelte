<script module lang="ts">
  export type LiteAvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'success' | 'warning' | 'error' | 'neutral';
  export type LiteAvatarSize = 'xs' | 'sm' | 'default' | 'lg';
</script>

<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
    src?: string | null;
    name?: string | null;
    subtitle?: string | null;
    status?: LiteAvatarStatus;
    size?: LiteAvatarSize;
    shape?: 'circle' | 'square';
    showName?: boolean;
    nullLabel?: string;
    class?: string;
  }

  let {
    field,
    value,
    error = [],
    mode = 'show',
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

  const resolvedSrc = $derived.by(() => {
    if (src !== undefined) return src;
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/'))) {
      return value;
    }
    if (value && typeof value === 'object' && 'src' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).src ?? '');
    }
    return null;
  });

  const resolvedName = $derived.by(() => {
    if (name !== undefined) return name;
    if (typeof value === 'string' && !value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('/')) {
      return value;
    }
    if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).name ?? '');
    }
    return null;
  });

  function getInitials(text?: string | null): string {
    const trimmed = text?.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  const initials = $derived(getInitials(resolvedName));
  const hasContent = $derived(Boolean(resolvedSrc || resolvedName?.trim()));
  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if !hasContent}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <span class="lite-avatar-wrapper {className}">
      <span class="lite-avatar-container">
        <span class="lite-avatar lite-avatar-{size} lite-avatar-{shape}">
          {#if resolvedSrc}
            <img src={resolvedSrc} alt={resolvedName?.trim() || 'Avatar'} class="lite-avatar-img" />
          {:else}
            <span class="lite-avatar-initials">{initials}</span>
          {/if}
        </span>
        {#if status}
          <span
            class="lite-avatar-dot lite-avatar-dot-{size} lite-avatar-status-{status}"
            title={`Status: ${status}`}
          ></span>
        {/if}
      </span>
      {#if showName && (resolvedName || subtitle)}
        <span class="lite-avatar-text-block">
          {#if resolvedName}
            <span class="lite-avatar-name">{resolvedName}</span>
          {/if}
          {#if subtitle}
            <span class="lite-avatar-subtitle">{subtitle}</span>
          {/if}
        </span>
      {/if}
    </span>
  {/if}
{:else}
  <div>
    <input
      type="text"
      name={field?.key ?? 'avatar'}
      id={field?.key ?? 'avatar'}
      value={String(resolvedSrc ?? resolvedName ?? value ?? '')}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field?.label ?? 'Avatar URL or name'}
      {...field?.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
