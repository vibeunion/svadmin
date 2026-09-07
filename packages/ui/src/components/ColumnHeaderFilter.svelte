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
          { value: 'eq' as const, label: '= Equal' },
          { value: 'gt' as const, label: '> Greater than' },
          { value: 'gte' as const, label: '>= Greater equal' },
          { value: 'lt' as const, label: '< Less than' },
          { value: 'lte' as const, label: '<= Less equal' },
        ];
      case 'date':
        return [
          { value: 'eq' as const, label: '= On date' },
          { value: 'gte' as const, label: '>= After or on' },
          { value: 'lte' as const, label: '<= Before or on' },
        ];
      case 'boolean':
        return [
          { value: 'eq' as const, label: 'Is' },
        ];
      default:
        return [
          { value: 'contains' as const, label: 'Contains' },
          { value: 'eq' as const, label: 'Equals' },
          { value: 'ne' as const, label: 'Not equals' },
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
          'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-421ac2be5045 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d',
          hasActiveFilter
            ? 'svadmin-u-30f13f694038 svadmin-u-20aaf08a7ed1'
            : 'svadmin-u-7be4d67a6256 svadmin-u-ea7b2e9e070e svadmin-u-39f703dbe296',
          className
        )}
        aria-label="Filter {field.label}"
      >
        <Filter class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="svadmin-u-6ca625288b1e svadmin-u-eb6e8b881acd svadmin-u-359090c2d529" align="start">
    <div class="svadmin-u-6ed543e2fbbb">
      <div class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-569eb16216dd svadmin-u-65fdbade2025 svadmin-u-591f378e24a1">
        Filter {field.label}
      </div>

      <div class="svadmin-u-da7c36cd8867">
        <label class="svadmin-u-0214b4b355d1 svadmin-u-d058ca6de60f svadmin-u-bfa603190748" for="header_filter_op_{field.key}">Operator</label>
        <select
          id="header_filter_op_{field.key}"
          bind:value={operator}
          class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
        >
          {#each applicableOperators as op (op.value)}
            <option value={op.value}>{op.label}</option>
          {/each}
        </select>
      </div>

      <div class="svadmin-u-da7c36cd8867">
        <label class="svadmin-u-0214b4b355d1 svadmin-u-d058ca6de60f svadmin-u-bfa603190748" for="header_filter_val_{field.key}">Value</label>
        {#if field.type === 'select' && field.options}
          <select
            id="header_filter_val_{field.key}"
            bind:value={filterVal}
            class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          >
            <option value="">All</option>
            {#each field.options as opt (opt.value)}
              <option value={String(opt.value)}>{opt.label}</option>
            {/each}
          </select>
        {:else if field.type === 'boolean'}
          <select
            id="header_filter_val_{field.key}"
            bind:value={filterVal}
            class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          >
            <option value="">All</option>
            <option value="true">Yes / True</option>
            <option value="false">No / False</option>
          </select>
        {:else if field.type === 'date'}
          <input
            id="header_filter_val_{field.key}"
            type="date"
            bind:value={filterVal}
            class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          />
        {:else}
          <input
            id="header_filter_val_{field.key}"
            type="text"
            bind:value={filterVal}
            placeholder="Search {field.label}..."
            class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          />
        {/if}
      </div>

      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-6b7d6e21ccbd svadmin-u-b950dda299d3 svadmin-u-591f378e24a1">
        <Button
          variant="ghost"
          size="sm"
          class="svadmin-u-d0a52b312f7d svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-44ee8ba0a421"
          onclick={handleClear}
        >
          <RotateCcw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          {i18n.t('common.clear', { defaultValue: 'Clear' })}
        </Button>
        <Button size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-0b91436debbd svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={handleApply}>
          <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          {i18n.t('common.apply', { defaultValue: 'Apply' })}
        </Button>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>
