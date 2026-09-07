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

<div class={cn('svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741', className)} data-testid="cascader">
  <Popover.Root bind:open>
    <Popover.Trigger class="svadmin-u-6da6a3c3f741">
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          {disabled}
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-968a1e649bad svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-582e6ef4b245 svadmin-u-9c24ab70af61 svadmin-u-674ec2b09890 svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752 svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e svadmin-u-2eba0d65d059',
            open && 'svadmin-u-16b1efa5875e svadmin-u-3e1868fc53e2 svadmin-u-0c15f6cff5a0'
          )}
        >
          <span class={cn('svadmin-u-f283ea9bea0e', displayLabel ? 'svadmin-u-d4108abe6359' : 'svadmin-u-bfa603190748')}>
            {displayLabel || (placeholder ?? (i18n.t('field.selectPlaceholder', undefined) ?? '请选择...'))}
          </span>

          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-012fbd121f37 svadmin-u-f58b02572ab2 svadmin-u-bfa603190748">
            {#if allowClear && displayLabel && !disabled}
              <span
                role="button"
                tabindex="0"
                class="svadmin-u-ea7b2e9e070e svadmin-u-34516836730d svadmin-u-de8350a3bbad"
                onclick={clearAll}
                onkeydown={(e) => {
                  if (e.key === 'Enter') clearAll(e as never);
                }}
              >
                <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </span>
            {/if}
            <ChevronsUpDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-0b8c506a0596" />
          </div>
        </button>
      {/snippet}
    </Popover.Trigger>

    <Popover.Content class="svadmin-u-23e1f628d033 svadmin-u-68fe531347b9 svadmin-u-8a539c7fe216 svadmin-u-06bbb43166db svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af" align="start">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3746131ec018 svadmin-u-e783642739e3 svadmin-u-8aee2b07b47d svadmin-u-1384f66f41d0">
        {#each columns as columnOptions, colIndex (colIndex)}
          <div class="svadmin-u-84789e8a20cd svadmin-u-1734f23deafe svadmin-u-8aee2b07b47d svadmin-u-92bf82f493b1 svadmin-u-eb6a3cef9686 svadmin-u-e2eedc5718f0">
            {#each columnOptions as option (option.value)}
              {@const isSelectedInPath = activePath[colIndex] === option.value}
              {@const hasChildren = Boolean(option.children && option.children.length > 0 && !option.isLeaf)}
              <button
                type="button"
                class={cn(
                  'svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-0b91436debbd svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-2eba0d65d059 svadmin-u-ceb69a6b0e5f',
                  isSelectedInPath
                    ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069'
                    : 'svadmin-u-68646cdcc246 svadmin-u-d4108abe6359',
                  option.disabled && 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162 svadmin-u-a4326536b8f5'
                )}
                onclick={() => handleSelectOption(colIndex, option)}
              >
                <span class="svadmin-u-f283ea9bea0e svadmin-u-36e579c0b41c">{option.label}</span>
                {#if hasChildren}
                  <ChevronRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-f2868c227fcd svadmin-u-f58b02572ab2" />
                {:else if isSelectedInPath && value && value[colIndex] === option.value}
                  <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1 svadmin-u-f58b02572ab2" />
                {/if}
              </button>
            {:else}
              <div class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                {i18n.t('common.noData', undefined) ?? '无数据'}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
