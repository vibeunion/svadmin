<script lang="ts">
  import { Plus, X } from '@lucide/svelte';
  import { FILTER_COLLECTION_LIMIT, isNumericFilterField, type FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';

  let { field, value, range = false, onchange }: {
    field: FieldDefinition; value: unknown; range?: boolean; onchange: (value: unknown[]) => void;
  } = $props();
  const i18n = useTranslation();
  const values = $derived<unknown[]>(Array.isArray(value) ? value : range ? [null, null] : [null]);

  function update(index: number, next: unknown) {
    onchange(values.map((item, position) => position === index ? next : item));
  }
</script>

<div class="filter-collection">
  {#each values as item, index (index)}
    {@const label = range
      ? i18n.t(index === 0 ? 'filter.rangeStart' : 'filter.rangeEnd')
      : i18n.t('filter.collectionItem', { number: String(index + 1) })}
    <div class="filter-collection-item">
      {#if field.type === 'select'}
        <Select aria-label={label} value={String(field.options?.findIndex(option => option.value === item) ?? -1)}
          onchange={(event: Event) => {
            if (!(event.currentTarget instanceof HTMLSelectElement)) return;
            const option = field.options?.[Number(event.currentTarget.value)];
            if (option && !option.disabled) update(index, option.value);
          }}>
          <option value="-1" disabled>{i18n.t('common.selectOption')}</option>
          {#each field.options ?? [] as option, position (position)}
            <option value={String(position)} disabled={option.disabled}>{option.label}</option>
          {/each}
        </Select>
      {:else if field.type === 'boolean'}
        <Select aria-label={label} value={typeof item === 'boolean' ? String(item) : ''}
          onchange={(event: Event) => {
            if (!(event.currentTarget instanceof HTMLSelectElement)) return;
            update(index, event.currentTarget.value === 'true' ? true : event.currentTarget.value === 'false' ? false : null);
          }}>
          <option value="" disabled>{i18n.t('common.selectOption')}</option>
          <option value="true">{i18n.t('common.yes')}</option>
          <option value="false">{i18n.t('common.no')}</option>
        </Select>
      {:else if isNumericFilterField(field)}
        <Input type="number" step="any" aria-label={label} value={typeof item === 'number' ? item : undefined}
          oninput={(event: Event) => {
            if (event.currentTarget instanceof HTMLInputElement) update(index, event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber);
          }} />
      {:else}
        <Input type="text" aria-label={label} value={typeof item === 'string' ? item : ''}
          oninput={(event: Event) => {
            if (event.currentTarget instanceof HTMLInputElement) update(index, event.currentTarget.value);
          }} />
      {/if}
      {#if !range}
        <Button type="button" variant="ghost" size="icon-sm" aria-label={i18n.t('filter.removeValue')}
          title={i18n.t('filter.removeValue')} disabled={values.length <= 1}
          onclick={() => onchange(values.filter((_, position) => position !== index))}>
          <X size={16} />
        </Button>
      {/if}
    </div>
  {/each}
  {#if !range}
    <Button type="button" variant="ghost" size="icon-sm" aria-label={i18n.t('filter.addValue')}
      title={i18n.t('filter.addValue')} disabled={values.length >= FILTER_COLLECTION_LIMIT}
      onclick={() => onchange([...values, null])}>
      <Plus size={16} />
    </Button>
  {/if}
</div>

<style>
  .filter-collection { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
  .filter-collection-item { display: flex; gap: 4px; align-items: center; width: 180px; max-width: 100%; }
</style>
