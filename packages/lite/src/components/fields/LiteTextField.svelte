<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { field, value, error = [], mode = 'show', class: className = '' }: Props = $props();
  let hasError = $derived(error.length > 0);

  /**
   * Native input type per value domain. Time, datetime, color, email, url and
   * phone fields must not degrade to a free-text box.
   */
  const nativeType: Record<string, string> = {
    time: 'time',
    datetime: 'datetime-local',
    color: 'color',
    email: 'email',
    url: 'url',
    phone: 'tel',
  };
  const hexColour = $derived(typeof value === 'string' && /^#[0-9a-f]{6}$/iu.test(value) ? value : '#000000');
  const colorNeedsTextFallback = $derived(field.type === 'color' && value != null && String(value) !== '' && !/^#[0-9a-f]{6}$/iu.test(String(value)));
  const inputType = $derived(
    field.type === 'color' && colorNeedsTextFallback ? 'text' : nativeType[field.type] ?? 'text',
  );
  const inputValue = $derived(inputType === 'color' ? hexColour : String(value ?? ''));
</script>

{#if mode === 'show'}
  <span class="lite-field-value {className}">{value == null ? '—' : String(value)}</span>
{:else}
  <div class="lite-field-edit {className}">
    <input
      type={inputType}
      name={field.key}
      id={field.key}
      value={inputValue}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field.label}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
