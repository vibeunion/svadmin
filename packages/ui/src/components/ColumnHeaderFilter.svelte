<script lang="ts">
  import { untrack } from 'svelte';
  import type { FieldDefinition, CrudOperator } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Popover from './ui/popover/index.js';
  import { Button } from './ui/button/index.js';
  import { Filter, Check, RotateCcw } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    field: FieldDefinition;
    currentValue?: unknown;
    currentOperator?: CrudOperator;
    onapply?: (operator: CrudOperator, value: unknown) => void;
    onclear?: () => void;
    class?: string;
  }

  let {
    field,
    currentValue,
    currentOperator = 'contains',
    onapply,
    onclear,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  let open = $state(false);
  let operator = $state<CrudOperator>(untrack(() => currentOperator));
  let filterVal = $state<string>(untrack(() => String(currentValue ?? '')));

  const hasActiveFilter = $derived(currentValue !== undefined && String(currentValue).trim().length > 0);

  const applicableOperators = $derived.by(() => {
    switch (field.type) {
      case 'number':
      case 'currency':
        return [
          { value: 'eq' as const, label: i18n.t('headerFilter.op.eqNum') },
          { value: 'gt' as const, label: i18n.t('headerFilter.op.gt') },
          { value: 'gte' as const, label: i18n.t('headerFilter.op.gte') },
          { value: 'lt' as const, label: i18n.t('headerFilter.op.lt') },
          { value: 'lte' as const, label: i18n.t('headerFilter.op.lte') },
        ];
      case 'date':
        return [
          { value: 'eq' as const, label: i18n.t('headerFilter.op.onDate') },
          { value: 'gte' as const, label: i18n.t('headerFilter.op.afterOrOn') },
          { value: 'lte' as const, label: i18n.t('headerFilter.op.beforeOrOn') },
        ];
      case 'boolean':
        return [
          { value: 'eq' as const, label: i18n.t('headerFilter.op.is') },
        ];
      default:
        return [
          { value: 'contains' as const, label: i18n.t('headerFilter.op.contains') },
          { value: 'eq' as const, label: i18n.t('headerFilter.op.equals') },
          { value: 'ne' as const, label: i18n.t('headerFilter.op.notEquals') },
        ];
    }
  });

  function handleApply() {
    let finalVal: unknown = filterVal.trim();
    if (field.type === 'number' || field.type === 'currency') {
      const num = Number(finalVal);
      finalVal = isNaN(num) ? finalVal : num;
    }
    onapply?.(operator, finalVal);
    open = false;
  }

  function handleClear() {
    filterVal = '';
    onclear?.();
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        class={cn(
          'inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors cursor-pointer',
          hasActiveFilter
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50',
          className
        )}
        aria-label={i18n.t('headerFilter.filterField', { label: field.label })}
      >
        <Filter class="h-3 w-3" />
      </button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-64 p-3 text-xs" align="start">
    <div class="space-y-3">
      <div class="font-medium text-foreground pb-1 border-b border-border/50 truncate" title={i18n.t('headerFilter.filterField', { label: field.label })}>
        {i18n.t('headerFilter.filterField', { label: field.label })}
      </div>

      <div class="space-y-1">
        <label class="block text-[11px] text-muted-foreground" for="header_filter_op_{field.key}">{i18n.t('headerFilter.operator')}</label>
        <select data-size="compact"
          id="header_filter_op_{field.key}"
          bind:value={operator}
          class="svadmin-select h-7.5 w-full"
        >
          {#each applicableOperators as op (op.value)}
            <option value={op.value}>{op.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-1">
        <label class="block text-[11px] text-muted-foreground" for="header_filter_val_{field.key}">{i18n.t('headerFilter.value')}</label>
        {#if field.type === 'select' && field.options}
          <select data-size="compact"
            id="header_filter_val_{field.key}"
            bind:value={filterVal}
            class="svadmin-select h-7.5 w-full"
          >
            <option value="">{i18n.t('common.all')}</option>
            {#each field.options as opt (opt.value)}
              <option value={String(opt.value)}>{opt.label}</option>
            {/each}
          </select>
        {:else if field.type === 'boolean'}
          <select data-size="compact"
            id="header_filter_val_{field.key}"
            bind:value={filterVal}
            class="svadmin-select h-7.5 w-full"
          >
            <option value="">{i18n.t('common.all')}</option>
            <option value="true">{i18n.t('common.yesTrue')}</option>
            <option value="false">{i18n.t('common.noFalse')}</option>
          </select>
        {:else if field.type === 'date'}
          <input
            id="header_filter_val_{field.key}"
            type="date"
            lang={i18n.locale}
            bind:value={filterVal}
            class="h-7.5 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        {:else}
          <input
            id="header_filter_val_{field.key}"
            type="text"
            bind:value={filterVal}
            placeholder={i18n.t('headerFilter.searchPlaceholder', { label: field.label })}
            class="h-7.5 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        {/if}
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onclick={handleClear}
        >
          <RotateCcw class="h-3 w-3" />
          {i18n.t('common.clear', { defaultValue: 'Clear' })}
        </Button>
        <Button size="sm" class="h-7 px-2.5 text-xs gap-1" onclick={handleApply}>
          <Check class="h-3 w-3" />
          {i18n.t('common.apply', { defaultValue: 'Apply' })}
        </Button>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>
