<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    src?: string | null;
    name?: string | null;
    size?: 'sm' | 'default' | 'lg';
    shape?: 'circle' | 'square';
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    src,
    name,
    size = 'default',
    shape = 'circle',
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const resolvedSrc = $derived.by(() => {
    if (src) return src;
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/'))) {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'src' in value) {
      return String((value as Record<string, unknown>).src ?? '');
    }
    return '';
  });

  const resolvedName = $derived.by(() => {
    if (name) return name;
    if (typeof value === 'string' && !resolvedSrc) return value;
    if (typeof value === 'object' && value !== null && 'name' in value) {
      return String((value as Record<string, unknown>).name ?? '');
    }
    return '';
  });

  function getInitials(str: string): string {
    const trimmed = str.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  const initials = $derived(getInitials(resolvedName));
</script>

{#if mode === 'show'}
  {#if !resolvedSrc && !resolvedName}
    <span>—</span>
  {:else}
    <div class="lite-avatar lite-avatar-{shape} lite-avatar-{size}">
      {#if resolvedSrc}
        <img src={resolvedSrc} alt={resolvedName || 'Avatar'} class="lite-avatar-img" />
      {:else}
        <span class="lite-avatar-text">{initials}</span>
      {/if}
    </div>
  {/if}
{:else}
  <div>
    <input
      type="text"
      name={field.key}
      id={field.key}
      value={resolvedSrc || (typeof value === 'string' ? value : '')}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder="Avatar URL or name"
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
