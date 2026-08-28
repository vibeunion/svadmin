<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeText } from '../../security';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    href?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    href,
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const stringValue = $derived.by(() => {
    if (value == null || value === '') return null;
    const str = toSafeText(value).trim();
    return str.length > 0 ? str : null;
  });

  const telHref = $derived.by(() => {
    if (!stringValue) return undefined;
    const candidate = (href ?? stringValue).replace(/^tel:/i, '');
    const normalized = candidate.replace(/[\s().-]/g, '');
    if (!/^\+?\d+$/.test(normalized)) return undefined;
    return `tel:${normalized}`;
  });
</script>

{#if mode === 'show'}
  {#if !stringValue}
    <span>—</span>
  {:else if telHref}
    <a href={telHref} class="lite-phone-link">{stringValue}</a>
  {:else}
    <span>{stringValue}</span>
  {/if}
{:else}
  <div>
    <input
      type="tel"
      name={field.key}
      id={field.key}
      value={stringValue ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field.label || '+1 (555) 000-0000'}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
