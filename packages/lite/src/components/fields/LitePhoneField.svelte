<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: string | number | null;
    href?: string;
    showIcon?: boolean;
    clickable?: boolean;
    copyable?: boolean;
    nullLabel?: string;
    oncopy?: (value: string) => void;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    href,
    showIcon = true,
    clickable = true,
    nullLabel = '—',
    class: className = '',
    error = [],
    mode = 'show',
  }: Props = $props();

  const stringValue = $derived.by(() => {
    if (value == null || value === '') return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
  });

  const telHref = $derived.by(() => {
    if (!stringValue) return undefined;
    const candidate = (href ?? stringValue).replace(/^tel:/i, '');
    const normalized = candidate.replace(/[\s().-]/g, '');
    if (!/^\+?\d+$/.test(normalized)) return undefined;
    return `tel:${normalized}`;
  });

  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if !stringValue}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <span class="lite-phone-container {className}">
      {#if showIcon}
        <span class="lite-phone-icon">📞</span>
      {/if}
      {#if clickable && telHref}
        <a href={telHref} class="lite-phone-link">
          {stringValue}
        </a>
      {:else}
        <span>{stringValue}</span>
      {/if}
    </span>
  {/if}
{:else}
  <div>
    <input
      type="tel"
      name={field?.key ?? 'phone'}
      id={field?.key ?? 'phone'}
      value={stringValue ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field?.label ?? '+1 (555) 000-0000'}
      {...field?.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
