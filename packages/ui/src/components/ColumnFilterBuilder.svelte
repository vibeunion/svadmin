<script lang="ts">
  import { Filter as FilterIcon } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import FilterBuilder from './FilterBuilder.svelte';

  export interface ColumnFilterBuilderProps {
    open?: boolean | undefined;
    fields: FieldDefinition[];
    filters?: Filter[] | undefined;
    logicalOperator?: ('and' | 'or') | undefined;
    allowedOperators?: readonly CrudOperator[] | undefined;
    allowedLogicalOperators?: readonly ('and' | 'or')[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    triggerVariant?: ('outline' | 'ghost' | 'secondary') | undefined;
    triggerSize?: ('default' | 'sm' | 'icon') | undefined;
    showTrigger?: boolean | undefined;
    class?: string | undefined;
    onApply?: ((filters: Filter[]) => void) | undefined;
    onReset?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    fields,
    filters = $bindable([]),
    logicalOperator = $bindable('and'),
    allowedOperators,
    allowedLogicalOperators = ['and', 'or'],
    title,
    description,
    triggerVariant = 'outline',
    triggerSize = 'sm',
    showTrigger = false,
    class: className = '',
    onApply,
    onReset,
  }: ColumnFilterBuilderProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let workingFilters = $state<Filter[]>([]);

  $effect(() => {
    if (open) {
      workingFilters = JSON.parse(JSON.stringify(filters));
    }
  });

  const activeFilterCount = $derived(
    filters.reduce((count, f) => {
      if ('field' in f) return count + 1;
      if (Array.isArray(f.value)) return count + f.value.length;
      return count + 1;
    }, 0),
  );

  function handleApplyInternal(compiled: Filter[]) {
    filters = compiled;
    onApply?.(compiled);
    open = false;
  }

  function handleResetInternal() {
    filters = [];
    workingFilters = [];
    onReset?.();
    onApply?.([]);
    open = false;
  }

  const resolvedTitle = $derived(
    title ?? (chinese ? '高级列组合筛选器' : 'Column Filter Builder'),
  );
  const resolvedDesc = $derived(
    description ??
      (chinese
        ? '多条件 AND / OR 嵌套逻辑树组合筛选，支持等于、包含、范围、为空等多维规则'
        : 'Build complex multi-condition AND / OR query logic trees with rich comparison operators'),
  );
</script>

{#if showTrigger}
  <Button
    type="button"
    variant={triggerVariant}
    size={triggerSize}
    onclick={() => (open = true)}
    class={cn('gap-1.5 text-xs', className)}
    aria-label={resolvedTitle}
  >
    <FilterIcon class="h-3.5 w-3.5" />
    <span>{resolvedTitle}</span>
    {#if activeFilterCount > 0}
      <span class="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
        {activeFilterCount}
      </span>
    {/if}
  </Button>
{/if}

<Sheet.Root bind:open>
  <Sheet.Content side="right" class="w-full sm:max-w-xl p-0 flex flex-col">
    <div class="px-6 py-5 border-b border-border/70 bg-card">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 text-primary">
          <FilterIcon class="h-5 w-5" />
          <Sheet.Title class="text-base font-semibold text-foreground">
            {resolvedTitle}
          </Sheet.Title>
        </div>
      </div>
      <Sheet.Description class="text-xs text-muted-foreground mt-1 leading-relaxed">
        {resolvedDesc}
      </Sheet.Description>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-4">
      <FilterBuilder
        {fields}
        bind:filters={workingFilters}
        bind:logicalOperator
        {allowedOperators}
        {allowedLogicalOperators}
        onApply={handleApplyInternal}
        onReset={handleResetInternal}
      />
    </div>
  </Sheet.Content>
</Sheet.Root>
