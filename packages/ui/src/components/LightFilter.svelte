<script lang="ts">
  import { Filter, X, RotateCcw, ChevronDown, Check } from '@lucide/svelte';
  import * as Popover from './ui/popover/index.js';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface LightFilterOption {
    label: string;
    value: string | number;
  }

  export interface LightFilterItem {
    key: string;
    label: string;
    placeholder?: string;
    type?: 'select' | 'input' | 'date';
    options?: LightFilterOption[];
    allowClear?: boolean;
  }

  export interface LightFilterProps {
    /** Filter field definitions */
    items: LightFilterItem[];
    /** Bound values object: key -> value */
    values?: Record<string, unknown>;
    /** Callback when filter values change */
    onchange?: (values: Record<string, unknown>) => void;
    /** Callback when all filters are reset */
    onreset?: () => void;
    /** Whether the filter bar has an outer border */
    bordered?: boolean;
    /** Size tier */
    size?: 'small' | 'default';
    /** Maximum visible items before collapsing into 'More' */
    maxDisplayCount?: number;
    /** Extra elements on the right */
    extra?: import('svelte').Snippet;
    /** Custom class name */
    class?: string;
    [key: string]: unknown;
  }

  let {
    items = [],
    values = $bindable({}),
    onchange,
    onreset,
    bordered = false,
    size = 'default',
    maxDisplayCount = 5,
    extra,
    class: className = '',
    ...restProps
  }: LightFilterProps = $props();

  const i18n = useTranslation();

  const primaryItems = $derived(items.slice(0, maxDisplayCount));
  const overflowItems = $derived(items.slice(maxDisplayCount));

  const activeCount = $derived(
    Object.values(values).filter((v) => v !== undefined && v !== '' && v !== null).length
  );

  function setFieldValue(key: string, val: unknown) {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (k !== key && v !== undefined && v !== '' && v !== null) {
        next[k] = v;
      }
    }
    if (val !== undefined && val !== '' && val !== null) {
      next[key] = val;
    }
    values = next;
    onchange?.(next);
  }

  function clearField(key: string, e?: MouseEvent) {
    e?.stopPropagation();
    setFieldValue(key, undefined);
  }

  function handleResetAll() {
    values = {};
    onreset?.();
    onchange?.({});
  }

  function getDisplayLabel(item: LightFilterItem): string {
    const currentVal = values[item.key];
    if (currentVal === undefined || currentVal === '' || currentVal === null) {
      return item.label;
    }
    if (item.options) {
      const match = item.options.find((o) => String(o.value) === String(currentVal));
      if (match) return `${item.label}: ${match.label}`;
    }
    return `${item.label}: ${String(currentVal)}`;
  }
</script>

<div
  data-svadmin-component="LightFilter"
  data-size={size}
  class={cn(
    'flex flex-wrap items-center gap-1.5',
    bordered && 'border border-border p-2 rounded-[4px] bg-background',
    className
  )}
  {...restProps}
>
  {#each primaryItems as item (item.key)}
    {@const hasValue = values[item.key] !== undefined && values[item.key] !== '' && values[item.key] !== null}
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            type="button"
            class={cn(
              'inline-flex items-center gap-1.5 transition-colors font-normal rounded-[4px] border select-none',
              size === 'small' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-xs',
              hasValue
                ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                : 'bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
            )}
            {...props}
          >
            <span class="truncate max-w-[160px]">{getDisplayLabel(item)}</span>

            {#if hasValue && item.allowClear !== false}
              <span
                role="button"
                tabindex={-1}
                aria-label="Clear filter"
                class="hover:text-destructive rounded-full p-0.5"
                onclick={(e) => clearField(item.key, e)}
                onkeydown={(e) => {
                  if (e.key === 'Enter') clearField(item.key);
                }}
              >
                <X class="h-3 w-3" />
              </span>
            {:else}
              <ChevronDown class="h-3 w-3 opacity-60" />
            {/if}
          </button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content align="start" class="w-56 p-2 rounded-[4px] shadow-md border border-border">
        {#if item.type === 'input'}
          <div class="space-y-2">
            <div class="text-xs font-medium text-foreground">{item.label}</div>
            <input
              type="text"
              value={String(values[item.key] ?? '')}
              placeholder={item.placeholder ?? item.label}
              oninput={(e) => setFieldValue(item.key, (e.target as HTMLInputElement).value)}
              class="w-full h-8 px-2.5 text-xs rounded-[4px] border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        {:else if item.type === 'date'}
          <div class="space-y-2">
            <div class="text-xs font-medium text-foreground">{item.label}</div>
            <input
              type="date"
              value={String(values[item.key] ?? '')}
              onchange={(e) => setFieldValue(item.key, (e.target as HTMLInputElement).value)}
              class="w-full h-8 px-2.5 text-xs rounded-[4px] border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        {:else}
          <!-- Default: select options -->
          <div class="space-y-1">
            <div class="px-2 py-1 text-xs font-semibold text-muted-foreground">{item.label}</div>
            <button
              type="button"
              class={cn(
                'w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] text-left transition-colors',
                !values[item.key] ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted text-foreground'
              )}
              onclick={() => setFieldValue(item.key, undefined)}
            >
              <span>{i18n.t('common.all') || 'All'}</span>
              {#if !values[item.key]}
                <Check class="h-3.5 w-3.5 text-primary" />
              {/if}
            </button>
            {#each (item.options ?? []) as opt (opt.value)}
              {@const selected = String(values[item.key]) === String(opt.value)}
              <button
                type="button"
                class={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] text-left transition-colors',
                  selected ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted text-foreground'
                )}
                onclick={() => setFieldValue(item.key, opt.value)}
              >
                <span>{opt.label}</span>
                {#if selected}
                  <Check class="h-3.5 w-3.5 text-primary" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </Popover.Content>
    </Popover.Root>
  {/each}

  <!-- Overflow items grouped into 'More Filters' -->
  {#if overflowItems.length > 0}
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            type="button"
            class={cn(
              'inline-flex items-center gap-1.5 transition-colors font-normal rounded-[4px] border select-none',
              size === 'small' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-xs',
              'bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
            )}
            {...props}
          >
            <Filter class="h-3 w-3" />
            <span>{i18n.t('common.filter') || 'More Filters'} ({overflowItems.length})</span>
            <ChevronDown class="h-3 w-3 opacity-60" />
          </button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content align="start" class="w-64 p-3 rounded-[4px] shadow-md border border-border space-y-3">
        {#each overflowItems as item (item.key)}
          <div class="space-y-1">
            <div class="text-xs font-medium text-foreground">{item.label}</div>
            {#if item.options}
              <select data-size="compact"
                class="svadmin-select w-full h-8"
                value={String(values[item.key] ?? '')}
                onchange={(e) => setFieldValue(item.key, (e.target as HTMLSelectElement).value)}
              >
                <option value="">{i18n.t('common.all') || 'All'}</option>
                {#each item.options as opt (opt.value)}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            {:else}
              <input
                type="text"
                value={String(values[item.key] ?? '')}
                placeholder={item.placeholder ?? item.label}
                oninput={(e) => setFieldValue(item.key, (e.target as HTMLInputElement).value)}
                class="w-full h-8 px-2 text-xs rounded-[4px] border border-input bg-background"
              />
            {/if}
          </div>
        {/each}
      </Popover.Content>
    </Popover.Root>
  {/if}

  {#if activeCount > 0}
    <button
      type="button"
      class={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-[2px]',
        size === 'small' ? 'text-[11px]' : 'text-xs'
      )}
      onclick={handleResetAll}
      title={i18n.t('common.reset') || 'Reset'}
    >
      <RotateCcw class="h-3 w-3" />
      <span>{i18n.t('common.reset') || 'Reset'}</span>
    </button>
  {/if}

  {#if extra}
    <div class="ml-auto flex items-center gap-2">
      {@render extra()}
    </div>
  {/if}
</div>
