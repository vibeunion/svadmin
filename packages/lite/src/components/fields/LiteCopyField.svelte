<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: string | number | null;
    displayValue?: string;
    masked?: boolean;
    monospace?: boolean;
    copyable?: boolean;
    title?: string;
    nullLabel?: string;
    oncopy?: (value: string) => void;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    displayValue,
    masked = false,
    monospace = true,
    nullLabel = '—',
    class: className = '',
    error = [],
    mode = 'show',
  }: Props = $props();

  function maskText(str: string): string {
    if (str.length <= 8) return '****';
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  }

  const rawString = $derived(value != null && value !== '' ? String(value) : '');
  const displayText = $derived.by(() => {
    if (!rawString) return nullLabel;
    if (displayValue) return displayValue;
    if (masked) return maskText(rawString);
    return rawString;
  });

  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if !rawString}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <span class="lite-copy-field {className}">
      <span class="lite-copy-text {monospace ? 'lite-font-mono' : ''}">
        {displayText}
      </span>
    </span>
  {/if}
{:else}
  <div>
    <input
      type="text"
      name={field?.key ?? 'copy_text'}
      id={field?.key ?? 'copy_text'}
      value={rawString}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field?.label ?? 'Value'}
      {...field?.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
