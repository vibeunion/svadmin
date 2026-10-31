<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  const i18n = useTranslation();
  let hasError = $derived(error.length > 0);

  /** Native input type follows the field domain: date-only stays date-only. */
  const inputType = $derived(field.type === 'datetime' ? 'datetime-local' : 'date');

  function pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  /**
   * Normalize into the value shape the native control expects. ISO-ish strings
   * are sliced instead of round-tripped through UTC, so a stored
   * `2024-03-15` never shifts to the previous day.
   */
  function formatDate(v: unknown): string {
    if (v == null || v === '') return '';
    if (typeof v === 'string') {
      if (inputType === 'datetime-local') {
        const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/u.exec(v);
        if (match?.[1] && match[2]) return `${match[1]}T${match[2]}`;
      } else {
        const match = /^(\d{4}-\d{2}-\d{2})/u.exec(v);
        if (match?.[1]) return match[1];
      }
    }
    const date = v instanceof Date ? v : new Date(String(v));
    if (Number.isNaN(date.getTime())) return '';
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return inputType === 'datetime-local' ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
  }

  const dateOptions = $derived(field.dateInput);
  const boundAttributes = $derived({
    ...(dateOptions?.min ? { min: dateOptions.min } : {}),
    ...(dateOptions?.max ? { max: dateOptions.max } : {}),
    ...(inputType === 'date' && dateOptions?.step ? { step: String(dateOptions.step) } : {}),
  });

  function displayDate(v: unknown): string {
    if (!v) return '—';
    try {
      return new Date(v as string).toLocaleDateString();
    } catch {
      return String(v);
    }
  }
</script>

{#if mode === 'show'}
  <span>{displayDate(value)}</span>
{:else}
  <div>
    <input
      type={inputType}
      lang={i18n.locale}
      name={field.key}
      id={field.key}
      value={formatDate(value)}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      {...boundAttributes}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
