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

  // In Lite version, relations might need to be rendered via server-side joined data 
  // passed through options, or just standard inputs requesting ID.
  function displayRelation(v: unknown): string {
    if (v == null) return '—';
    if (typeof v === 'object' && v !== null) {
      const record = v as Record<string, unknown>;
      const idField = field.optionValue ?? 'id';
      const labelField = field.optionLabel ?? 'name';
      if (record[idField] != null) {
        return String(record[labelField] ?? record[idField]);
      }
    }
    // Try options
    const opt = field.options?.find(o => String(o.value) === String(v));
    return opt?.label ?? String(v);
  }
</script>

{#if mode === 'show'}
  <span class="lite-badge">{displayRelation(value)}</span>
{:else}
  <div>
    {#if field.options && field.options.length > 0}
      <!-- Render as select if options provided by loader -->
      <select
        name={field.key}
        id={field.key}
        class="lite-select {hasError ? 'lite-input-error' : ''}"
        value={typeof value === 'object' && value
          ? String((value as Record<string, unknown>)[field.optionValue ?? 'id'] ?? '')
          : String(value ?? '')}
        required={field.required}
      >
        <option value="">-- {t('common.select') || 'Select'} Reference --</option>
        {#each field.options as opt, _i (_i)}
          <option value={String(opt.value)}>
            {opt.label}
          </option>
        {/each}
      </select>
    {:else}
      <!-- Fallback text input for target ID -->
      <input
        type="text"
        name={field.key}
        id={field.key}
        value={typeof value === 'object' && value
          ? String((value as Record<string, unknown>)[field.optionValue ?? 'id'] ?? '')
          : String(value ?? '')}
        class="lite-input {hasError ? 'lite-input-error' : ''}"
        placeholder="Enter reference ID"
        {...field.required ? { required: true } : {}}
      />
    {/if}
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
