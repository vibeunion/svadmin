<script lang="ts">
  import { ChevronRight, Check, X, ChevronsUpDown } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import * as Popover from './ui/popover/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface CascaderOption {
    value: string | number;
    label: string;
    children?: CascaderOption[];
    disabled?: boolean;
    isLeaf?: boolean;
  }

  const i18n = useTranslation();

  interface Props {
    options?: CascaderOption[];
    value?: (string | number)[];
    separator?: string;
    placeholder?: string;
    changeOnSelect?: boolean;
    disabled?: boolean;
    allowClear?: boolean;
    class?: string;
    onchange?: (value: (string | number)[] | undefined, selectedOptions: CascaderOption[]) => void;
  }

  let {
    options = [],
    value = $bindable(undefined),
    separator = ' / ',
    placeholder,
    changeOnSelect = false,
    disabled = false,
    allowClear = true,
    class: className,
    onchange,
  }: Props = $props();

  let open = $state(false);
  // Active selected path while navigating panels
  let activePath = $state<(string | number)[]>([]);

  $effect(() => {
    if (value && Array.isArray(value)) {
      activePath = [...value];
    } else {
      activePath = [];
    }
  });

  // Calculate columns based on activePath
  const columns = $derived.by<CascaderOption[][]>(() => {
    const cols: CascaderOption[][] = [options];
    let currentOptions = options;

    for (const val of activePath) {
      const selectedOpt = currentOptions.find((o) => o.value === val);
      if (selectedOpt && selectedOpt.children && selectedOpt.children.length > 0) {
        cols.push(selectedOpt.children);
        currentOptions = selectedOpt.children;
      } else {
        break;
      }
    }

    return cols;
  });

  // Selected options objects corresponding to value
  const selectedOptions = $derived.by<CascaderOption[]>(() => {
    if (!value || !Array.isArray(value) || value.length === 0) return [];
    const opts: CascaderOption[] = [];
    let currentLevel = options;

    for (const val of value) {
      const found = currentLevel.find((o) => o.value === val);
      if (found) {
        opts.push(found);
        currentLevel = found.children ?? [];
      } else {
        break;
      }
    }
    return opts;
  });

  const displayLabel = $derived.by(() => {
    if (selectedOptions.length === 0) return '';
    return selectedOptions.map((o) => o.label).join(separator);
  });

  function handleSelectOption(colIndex: number, option: CascaderOption) {
    if (option.disabled) return;

    const nextPath = [...activePath.slice(0, colIndex), option.value];
    activePath = nextPath;

    const hasChildren = Boolean(option.children && option.children.length > 0 && !option.isLeaf);

    if (!hasChildren || changeOnSelect) {
      value = nextPath;
      const currentSelected = getOptionsForPath(nextPath);
      onchange?.(nextPath, currentSelected);
      if (!hasChildren) {
        open = false;
      }
    }
  }

  function getOptionsForPath(path: (string | number)[]): CascaderOption[] {
    const result: CascaderOption[] = [];
    let currentLevel = options;
    for (const val of path) {
      const found = currentLevel.find((o) => o.value === val);
      if (found) {
        result.push(found);
        currentLevel = found.children ?? [];
      }
    }
    return result;
  }

  function clearAll(event?: MouseEvent) {
    event?.stopPropagation();
    value = undefined;
    activePath = [];
    onchange?.(undefined, []);
  }
</script>

<div class={cn('relative w-full', className)} data-testid="cascader">
  <Popover.Root bind:open>
    <Popover.Trigger class="w-full">
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          {disabled}
          class={cn(
            'flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left',
            open && 'ring-2 ring-ring ring-offset-2'
          )}
        >
          <span class={cn('truncate', displayLabel ? 'text-foreground' : 'text-muted-foreground')}>
            {displayLabel || (placeholder ?? (i18n.t('field.selectPlaceholder', undefined) ?? '请选择...'))}
          </span>

          <div class="flex items-center gap-1 shrink-0 ml-1 text-muted-foreground">
            {#if allowClear && displayLabel && !disabled}
              <span
                role="button"
                tabindex="0"
                class="hover:text-foreground cursor-pointer p-0.5"
                onclick={clearAll}
                onkeydown={(e) => {
                  if (e.key === 'Enter') clearAll(e as never);
                }}
              >
                <X class="h-3.5 w-3.5" />
              </span>
            {/if}
            <ChevronsUpDown class="h-3.5 w-3.5 opacity-50" />
          </div>
        </button>
      {/snippet}
    </Popover.Trigger>

    <Popover.Content class="w-auto min-w-[180px] p-0 shadow-lg border border-border" align="start">
      <div class="flex divide-x divide-border max-h-64 overflow-x-auto">
        {#each columns as columnOptions, colIndex (colIndex)}
          <div class="w-40 min-w-[140px] max-h-64 overflow-y-auto p-1 space-y-0.5">
            {#each columnOptions as option (option.value)}
              {@const isSelectedInPath = activePath[colIndex] === option.value}
              {@const hasChildren = Boolean(option.children && option.children.length > 0 && !option.isLeaf)}
              <button
                type="button"
                class={cn(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition-colors',
                  isSelectedInPath
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted/60 text-foreground',
                  option.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                )}
                onclick={() => handleSelectOption(colIndex, option)}
              >
                <span class="truncate flex-1">{option.label}</span>
                {#if hasChildren}
                  <ChevronRight class="h-3.5 w-3.5 shrink-0 opacity-60 ml-1" />
                {:else if isSelectedInPath && value && value[colIndex] === option.value}
                  <Check class="h-3.5 w-3.5 shrink-0 text-primary ml-1" />
                {/if}
              </button>
            {:else}
              <div class="py-4 text-center text-xs text-muted-foreground">
                {i18n.t('common.noData', undefined) ?? '无数据'}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
