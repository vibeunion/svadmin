<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import * as Popover from './ui/popover/index.js';
  import { SlidersHorizontal, RotateCcw, ArrowUp, ArrowDown, Search } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface ColumnItem {
    key: string;
    label: string;
    visible: boolean;
    fixed?: 'left' | 'right';
  }

  interface Props {
    columns: ColumnItem[];
    onchange?: (columns: ColumnItem[]) => void;
    onreset?: () => void;
    storageKey?: string;
    title?: string;
    triggerVariant?: 'outline' | 'ghost' | 'secondary';
    triggerSize?: 'default' | 'sm' | 'icon' | 'icon-sm';
    class?: string;
  }

  let {
    columns = $bindable([]),
    onchange,
    onreset,
    storageKey,
    title,
    triggerVariant = 'outline',
    triggerSize = 'sm',
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  let filterText = $state('');
  let open = $state(false);

  // Snapshot initial configuration for reset
  let initialSnapshot = $state<ColumnItem[]>(JSON.parse(JSON.stringify(columns)));

  const displayTitle = $derived(title ?? i18n.t('common.columnSettings', { defaultValue: 'Columns' }));
  const resetLabel = $derived(i18n.t('common.reset', { defaultValue: 'Reset' }));

  const filteredColumns = $derived(
    filterText.trim()
      ? columns.filter((c) => c.label.toLowerCase().includes(filterText.toLowerCase()) || c.key.toLowerCase().includes(filterText.toLowerCase()))
      : columns
  );

  const allVisible = $derived(columns.every((c) => c.visible));
  const someVisible = $derived(columns.some((c) => c.visible) && !allVisible);

  function savePreference(cols: ColumnItem[]) {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(cols));
      } catch {
        /* storage unavailable */
      }
    }
  }

  function toggleColumn(key: string) {
    columns = columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
    savePreference(columns);
    onchange?.(columns);
  }

  function toggleAll(checked: boolean) {
    columns = columns.map((c) => ({ ...c, visible: checked }));
    savePreference(columns);
    onchange?.(columns);
  }

  function moveColumn(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const next = [...columns];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    columns = next;
    savePreference(columns);
    onchange?.(columns);
  }

  function handleReset() {
    columns = JSON.parse(JSON.stringify(initialSnapshot));
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* storage unavailable */
      }
    }
    onreset?.();
    onchange?.(columns);
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant={triggerVariant}
        size={triggerSize}
        class={cn('svadmin-u-58284b4ea568 svadmin-u-359090c2d529 svadmin-u-8ecebc9f80e6', className)}
        aria-label={displayTitle}
      >
        <SlidersHorizontal class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" data-icon="inline-start" />
        <span>{displayTitle}</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="svadmin-u-92e13d146fd7 svadmin-u-eb6e8b881acd svadmin-u-359090c2d529" align="end">
    <!-- Header -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <Checkbox
          checked={allVisible}
          indeterminate={someVisible}
          onCheckedChange={(checked) => toggleAll(checked === true)}
          aria-label={i18n.t('common.selectAll', { defaultValue: 'Select All' })}
        />
        <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{displayTitle}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-f6fe902450dc svadmin-u-45d828117213 svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-44ee8ba0a421"
        onclick={handleReset}
      >
        <RotateCcw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {resetLabel}
      </Button>
    </div>

    <!-- Filter input if many columns -->
    {#if columns.length > 6}
      <div class="svadmin-u-d89972fe17d6 svadmin-u-50d0d216a2f8 svadmin-u-65281709dacf">
        <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-d83be576442b svadmin-u-9a2db8f949b6 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
        <input
          type="text"
          bind:value={filterText}
          placeholder={i18n.t('common.search', { defaultValue: 'Search columns...' })}
          class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-b00f43c30c2b svadmin-u-20ebde75765d svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529 svadmin-u-35ca6b75d707 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
        />
      </div>
    {/if}

    <!-- Column list with ordering -->
    <div class="svadmin-u-50d0d216a2f8 svadmin-u-67d7e383dca6 svadmin-u-92bf82f493b1 svadmin-u-da7c36cd8867 svadmin-u-eda955402ba6">
      {#each filteredColumns as col (col.key)}
        {@const realIdx = columns.findIndex((c) => c.key === col.key)}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-eb6a3cef9686 svadmin-u-421ac2be5045 svadmin-u-39f703dbe296 group svadmin-u-ceb69a6b0e5f">
          <label class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-34516836730d svadmin-u-7f6912283f11 svadmin-u-f283ea9bea0e svadmin-u-36e579c0b41c svadmin-u-aa2c13a5e1b4">
            <Checkbox
              checked={col.visible}
              onCheckedChange={() => toggleColumn(col.key)}
            />
            <span class="svadmin-u-f283ea9bea0e svadmin-u-d4108abe6359 {col.visible ? '' : 'svadmin-u-bfa603190748 line-through svadmin-u-f2868c227fcd'}">
              {col.label}
            </span>
          </label>

          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e svadmin-u-7065497e1ca0 svadmin-u-181f3d6c9821 svadmin-u-67d6184a0024">
            <Button
              variant="ghost"
              size="icon"
              class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
              disabled={realIdx === 0}
              onclick={() => moveColumn(realIdx, 'up')}
              aria-label="Move up"
            >
              <ArrowUp class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
              disabled={realIdx === columns.length - 1}
              onclick={() => moveColumn(realIdx, 'down')}
              aria-label="Move down"
            >
              <ArrowDown class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
