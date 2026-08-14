<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);

  function displayOptions(valuesRaw: unknown): string[] {
    if (!valuesRaw || !Array.isArray(valuesRaw)) return [];
    return valuesRaw.map(v => {
      const opt = field.options?.find(o => String(o.value) === String(v));
      return opt?.label ?? String(v);
    });
  }

  const valuesArray = $derived(Array.isArray(value) ? value.map(String) : []);
</script>

{#if mode === 'show'}
  <div class="lite-inline-xs lite-flex-wrap">
    {#each displayOptions(value) as opt, _i (_i)}
      <span class="lite-badge">{opt}</span>
    {:else}
      <span>—</span>
    {/each}
  </div>
{:else}
  <div>
    <select
      name={field.key}
      id={field.key}
      multiple
      class="lite-select {hasError ? 'lite-input-error' : ''}"
      style="height: 120px;"
      {...field.required ? { required: true } : {}}
    >
      {#if field.options}
        {#each field.options as opt, _i (_i)}
          <option value={String(opt.value)} selected={valuesArray.includes(String(opt.value))}>
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
