<script lang="ts">
  import { X, ArrowLeftRight, Check, Copy, Search, SlidersHorizontal } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface CompareFieldConfig<T = Record<string, unknown>> {
    key: string;
    label: string;
    category?: string | undefined;
    formatter?: ((value: unknown, record: T) => string) | undefined;
    highlightDiff?: boolean | undefined;
  }

  export interface RecordCompareModalProps {
    /** Controlled open state */
    open?: boolean | undefined;
    /** Display title (default: 'Record Comparison' / '实体记录对比') */
    title?: string | undefined;
    /** Subtitle or description */
    description?: string | undefined;
    /** List of records to compare (2 to 5 records) */
    records: Record<string, unknown>[];
    /** Optional custom field definitions. If omitted, automatically inferred from record properties */
    fields?: CompareFieldConfig[] | undefined;
    /** Index of baseline/benchmark record (default: 0) */
    benchmarkIndex?: number | undefined;
    /** Initial filter state: only show rows with differences (default: false) */
    defaultOnlyDiff?: boolean | undefined;
    /** Initial filter state: hide identical rows (default: false) */
    defaultHideIdentical?: boolean | undefined;
    /** Record identifier key (default: 'id') */
    recordIdKey?: string | undefined;
    /** Record title/name key (default: 'title' || 'name' || 'id') */
    recordTitleKey?: string | undefined;
    /** Presentation mode: 'modal' (center overlay) or 'drawer' (slide from right) (default: 'modal') */
    layout?: 'modal' | 'drawer' | undefined;
    /** Allow syncing field value from benchmark to target record (default: true) */
    allowSync?: boolean | undefined;
    /** Additional CSS classes for modal container */
    class?: string | undefined;
    /** Callback when user closes the modal */
    onclose?: (() => void) | undefined;
    /** Callback when user clicks sync button from benchmark to target record */
    onsync?: ((sourceRecord: Record<string, unknown>, targetRecord: Record<string, unknown>, fieldKey: string) => void) | undefined;
  }

  let {
    open = $bindable(false),
    title = 'Record Comparison',
    description,
    records = [],
    fields,
    benchmarkIndex = $bindable(0),
    defaultOnlyDiff = false,
    defaultHideIdentical = false,
    recordIdKey = 'id',
    recordTitleKey,
    layout = 'modal',
    allowSync = true,
    class: className = '',
    onclose,
    onsync,
  }: RecordCompareModalProps = $props();

  let onlyDiff = $state(untrack(() => defaultOnlyDiff || defaultHideIdentical));
  let highlightDiff = $state(true);
  let searchQuery = $state('');
  let copiedField = $state<string | null>(null);

  // Inferred or provided field definitions
  const effectiveFields = $derived.by<CompareFieldConfig[]>(() => {
    if (fields && fields.length > 0) return fields;
    if (records.length === 0) return [];

    const keys = new Set<string>();
    for (const rec of records) {
      if (rec && typeof rec === 'object') {
        for (const k of Object.keys(rec)) {
          if (!k.startsWith('_') && k !== 'password' && k !== 'secret') {
            keys.add(k);
          }
        }
      }
    }

    return Array.from(keys).map((k) => ({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      highlightDiff: true,
    }));
  });

  // Benchmark record
  const benchmarkRecord = $derived(records[benchmarkIndex] ?? records[0]);

  // Check whether a specific field has different values across the provided records
  function isFieldDifferent(fieldKey: string): boolean {
    if (records.length < 2) return false;
    const baseVal = JSON.stringify(benchmarkRecord?.[fieldKey] ?? null);
    for (let i = 0; i < records.length; i++) {
      if (i === benchmarkIndex) continue;
      const curVal = JSON.stringify(records[i]?.[fieldKey] ?? null);
      if (curVal !== baseVal) return true;
    }
    return false;
  }

  // Filtered rows
  const visibleFields = $derived.by(() => {
    return effectiveFields.filter((f) => {
      // 1. Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = f.label.toLowerCase().includes(q);
        const matchesKey = f.key.toLowerCase().includes(q);
        if (!matchesLabel && !matchesKey) return false;
      }

      // 2. Diff filter
      if (onlyDiff && !isFieldDifferent(f.key)) return false;

      return true;
    });
  });

  // Format value safely
  function formatValue(field: CompareFieldConfig, record: Record<string, unknown> | undefined): string {
    if (!record) return '—';
    const val = record[field.key];
    if (field.formatter) {
      return field.formatter(val, record);
    }
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  function getRecordTitle(record: Record<string, unknown> | undefined, index: number): string {
    if (!record) return `Record #${index + 1}`;
    if (recordTitleKey && record[recordTitleKey]) {
      return String(record[recordTitleKey]);
    }
    return (
      (record['title'] as string | undefined) ??
      (record['name'] as string | undefined) ??
      (record['label'] as string | undefined) ??
      (record[recordIdKey] as string | undefined) ??
      `Record #${index + 1}`
    );
  }

  function handleClose() {
    open = false;
    onclose?.();
  }

  function handleSync(targetRecord: Record<string, unknown>, fieldKey: string) {
    if (!benchmarkRecord || !targetRecord) return;
    onsync?.(benchmarkRecord, targetRecord, fieldKey);
    copiedField = `${String(targetRecord[recordIdKey] ?? 'target')}_${fieldKey}`;
    setTimeout(() => {
      copiedField = null;
    }, 1500);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    aria-label={title}
    data-svadmin-component="RecordCompareModal"
    data-layout={layout}
    class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      role="button"
      tabindex="-1"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
      onclick={handleClose}
      aria-label="Close dialog"
    ></div>

    <!-- Container: Modal or Drawer -->
    <div
      class={cn(
        'relative z-50 flex flex-col border border-border bg-card text-card-foreground shadow-[var(--shadow-overlay)] transition-all',
        layout === 'drawer'
          ? 'fixed right-0 top-0 h-full w-full max-w-4xl rounded-none border-l'
          : 'mx-4 my-6 h-[85vh] w-full max-w-5xl rounded-md',
        className,
      )}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-6 py-3.5">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <ArrowLeftRight class="h-4 w-4" />
          </div>
          <div>
            <h2 class="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {#if description}
              <p class="text-xs text-muted-foreground mt-0.5">{description}</p>
            {/if}
          </div>
        </div>

        <button
          type="button"
          onclick={handleClose}
          class="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-6 py-2.5 text-xs">
        <div class="flex items-center gap-2">
          <div class="relative w-48 sm:w-64">
            <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Filter attributes..."
              class="h-8 w-full rounded-sm border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onclick={() => (onlyDiff = !onlyDiff)}
            class={cn(
              'h-8 inline-flex items-center gap-1.5 rounded-sm border px-3 text-xs font-medium transition-colors cursor-pointer',
              onlyDiff
                ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
            <span>Only Differences</span>
          </button>
        </div>

        <div class="flex items-center gap-2 text-muted-foreground text-xs">
          <span>Comparing <strong class="font-mono tabular-nums text-foreground">{records.length}</strong> records</span>
          <span>•</span>
          <span><strong class="font-mono tabular-nums text-foreground">{visibleFields.length}</strong> fields shown</span>
        </div>
      </div>

      <!-- Comparison Matrix Table Area -->
      <div class="flex-1 overflow-auto p-6">
        {#if records.length < 2}
          <div class="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
            <ArrowLeftRight class="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p class="text-sm font-medium">Please select at least 2 records to compare.</p>
          </div>
        {:else if visibleFields.length === 0}
          <div class="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
            <p class="text-sm font-medium">No matching attributes found for the current filters.</p>
            {#if onlyDiff}
              <button
                type="button"
                onclick={() => {
                  onlyDiff = false;
                  searchQuery = '';
                }}
                class="mt-2 text-xs text-primary underline cursor-pointer"
              >
                Clear comparison filters
              </button>
            {/if}
          </div>
        {:else}
          <div class="overflow-x-auto rounded-md border border-border bg-card">
            <table class="w-full text-left text-xs border-collapse">
              <!-- Table Header: Record Columns -->
              <thead>
                <tr class="h-10 border-b border-border bg-muted/60">
                  <!-- Attribute header -->
                  <th class="sticky left-0 z-20 w-44 bg-muted/95 p-3 text-xs font-semibold text-muted-foreground border-r border-border backdrop-blur-sm sm:w-56">
                    Attribute
                  </th>

                  <!-- Record Headers -->
                  {#each records as record, idx (record[recordIdKey] ?? idx)}
                    {@const isBenchmark = idx === benchmarkIndex}
                    <th class="min-w-[180px] p-3 text-xs font-semibold text-foreground border-l border-border">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center justify-between gap-1.5">
                          <span class="truncate font-medium text-foreground">
                            {getRecordTitle(record, idx)}
                          </span>
                          {#if isBenchmark}
                            <span class="inline-flex items-center rounded-sm bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 text-xs font-medium">
                              Baseline
                            </span>
                          {:else}
                            <button
                              type="button"
                              onclick={() => (benchmarkIndex = idx)}
                              class="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Set as baseline for comparison"
                            >
                              Set Baseline
                            </button>
                          {/if}
                        </div>
                        <span class="font-mono text-xs text-muted-foreground tabular-nums">
                          ID: {record[recordIdKey] ?? `#${idx + 1}`}
                        </span>
                      </div>
                    </th>
                  {/each}
                </tr>
              </thead>

              <!-- Table Body -->
              <tbody class="divide-y divide-border">
                {#each visibleFields as field (field.key)}
                  {@const isDiff = isFieldDifferent(field.key)}
                  <tr
                    class={cn(
                      'transition-colors',
                      isDiff && highlightDiff ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-muted/40',
                    )}
                  >
                    <!-- Attribute label -->
                    <td class="sticky left-0 z-10 w-44 bg-card p-3 text-xs font-medium text-foreground border-r border-border backdrop-blur-sm sm:w-56">
                      <div class="flex items-center gap-1.5">
                        {#if isDiff && highlightDiff}
                          <span class="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Different value across records"></span>
                        {/if}
                        <span class="truncate" title={field.label}>{field.label}</span>
                      </div>
                      {#if field.category}
                        <span class="text-xs text-muted-foreground">{field.category}</span>
                      {/if}
                    </td>

                    <!-- Values for each record -->
                    {#each records as record, idx (record[recordIdKey] ?? idx)}
                      {@const isBenchmark = idx === benchmarkIndex}
                      {@const formattedVal = formatValue(field, record)}
                      {@const baseVal = formatValue(field, benchmarkRecord)}
                      {@const cellDiff = !isBenchmark && formattedVal !== baseVal}
                      {@const cellCopied = copiedField === `${record[recordIdKey] ?? 'target'}_${field.key}`}

                      <td
                        class={cn(
                          'p-3 border-l border-border font-mono text-xs tabular-nums transition-colors relative',
                          cellDiff && highlightDiff ? 'font-medium text-primary' : 'text-foreground',
                        )}
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span class="truncate" title={formattedVal}>
                            {formattedVal}
                          </span>

                          <!-- Sync button from baseline to this record -->
                          {#if allowSync && !isBenchmark && cellDiff}
                            <button
                              type="button"
                              onclick={() => handleSync(record, field.key)}
                              class={cn(
                                'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs transition-colors shrink-0 cursor-pointer',
                                cellCopied
                                  ? 'border-success/30 bg-success/10 text-success'
                                  : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5',
                              )}
                              title="Sync value from baseline record"
                            >
                              {#if cellCopied}
                                <Check class="h-3 w-3 text-success" />
                                <span class="text-success font-sans">Synced</span>
                              {:else}
                                <Copy class="h-3 w-3" />
                                <span class="font-sans">Sync</span>
                              {/if}
                            </button>
                          {/if}
                        </div>
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20">
        <span class="text-xs text-muted-foreground">
          Baseline: <strong class="text-foreground">{getRecordTitle(benchmarkRecord, benchmarkIndex)}</strong>
        </span>

        <button
          type="button"
          onclick={handleClose}
          class="h-8 rounded-sm border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
