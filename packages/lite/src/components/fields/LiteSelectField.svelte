<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);

  function displaySelect(v: unknown): string {
    if (v == null) return '—';
    const opt = field.options?.find(o => String(o.value) === String(v));
    return opt?.label ?? String(v);
  }
</script>

{#if mode === 'show'}
  <span class="lite-badge">{displaySelect(value)}</span>
{:else}
  <div>
    <select
      name={field.key}
      id={field.key}
      class="lite-select {hasError ? 'lite-input-error' : ''}"
      value={String(value ?? '')}
      {...field.required ? { required: true } : {}}
    >
      <option value="">-- {t('common.select') || 'Select'} --</option>
      {#if field.options}
        {#each field.options as opt, _i (_i)}
          <option value={String(opt.value)}>
            {opt.label}
          </option>
        {/each}
      {/if}
    </select>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
