<script lang="ts">
  import { getResource, captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { parseCSV, toCsv } from '@svadmin/core';
  import * as Dialog from './ui/dialog/index.js';
  import { Button } from './ui/button/index.js';
  import { Progress } from './ui/progress/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Upload, ArrowRight, ArrowLeft, AlertCircle, Download, FileSpreadsheet, Loader2 } from '@lucide/svelte';

  interface Props {
    resourceName: string;
    open?: boolean;
    batchSize?: number;
    onSuccess?: (result: { succeeded: number; failed: number }) => void;
  }

  let {
    resourceName,
    open = $bindable(false),
    batchSize = 20,
    onSuccess,
  }: Props = $props();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const resource = $derived(getResource(resourceName));
  const availableFields = $derived(
    resource.fields.filter((f) => f.key !== (resource.primaryKey ?? 'id') && f.showInForm !== false)
  );

  let currentStep = $state<1 | 2 | 3>(1);
  let fileName = $state('');
  let rawHeaders = $state<string[]>([]);
  let rawRows = $state<string[][]>([]);
  let columnMapping = $state<Record<string, string>>({}); // header -> fieldKey or ''

  let isImporting = $state(false);
  let processedCount = $state(0);
  let succeededCount = $state(0);
  let failedRecords = $state<Array<{ row: Record<string, unknown>; error: string }>>([]);

  const progressPercent = $derived(
    rawRows.length > 0 ? Math.min(100, Math.round((processedCount / rawRows.length) * 100)) : 0
  );

  async function handleFileSelect(selectedFile: File) {
    fileName = selectedFile.name;
    const text = await selectedFile.text();
    const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

    if (fileName.endsWith('.json')) {
      try {
        const json = JSON.parse(cleanText);
        if (Array.isArray(json) && json.length > 0) {
          const keys = Object.keys(json[0]);
          rawHeaders = keys;
          rawRows = json.map((item) => keys.map((k) => String(item[k] ?? '')));
        }
      } catch {
        /* invalid json */
      }
    } else {
      const rows = parseCSV(cleanText);
      if (rows.length > 0) {
        rawHeaders = rows[0];
        rawRows = rows.slice(1).filter((r: string[]) => r.some((cell: string) => cell.trim().length > 0));
      }
    }

    // Auto-match headers to fields by key or label
    const initialMapping: Record<string, string> = {};
    for (const h of rawHeaders) {
      const normalized = h.toLowerCase().trim().replace(/[-_]/g, '');
      const match = availableFields.find(
        (f) =>
          f.key.toLowerCase().replace(/[-_]/g, '') === normalized ||
          f.label.toLowerCase().replace(/[-_]/g, '') === normalized
      );
      initialMapping[h] = match ? match.key : '';
    }
    columnMapping = initialMapping;
    currentStep = 2;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  async function startImport() {
    currentStep = 3;
    isImporting = true;
    processedCount = 0;
    succeededCount = 0;
    failedRecords = [];

    const provider = adminContext.getDataProviderForResource(resourceName);

    // Build mapped records
    const recordsToImport: Record<string, unknown>[] = [];
    for (const row of rawRows) {
      const record: Record<string, unknown> = {};
      rawHeaders.forEach((header, idx) => {
        const targetFieldKey = columnMapping[header];
        if (targetFieldKey) {
          const fieldDef = availableFields.find((f) => f.key === targetFieldKey);
          let val: unknown = row[idx] ?? '';
          if (fieldDef?.type === 'number') {
            const num = Number(val);
            val = isNaN(num) ? val : num;
          } else if (fieldDef?.type === 'boolean') {
            val = val === 'true' || val === '1' || val === 'yes' || val === '是';
          }
          record[targetFieldKey] = val;
        }
      });
      recordsToImport.push(record);
    }

    // Execute in batches
    for (let i = 0; i < recordsToImport.length; i += batchSize) {
      const batch = recordsToImport.slice(i, i + batchSize);
      if (provider.createMany) {
        try {
          await provider.createMany({ resource: resourceName, variables: batch });
          succeededCount += batch.length;
        } catch (err) {
          batch.forEach((item) => {
            failedRecords.push({ row: item, error: err instanceof Error ? err.message : String(err) });
          });
        }
      } else {
        for (const item of batch) {
          try {
            await provider.create({ resource: resourceName, variables: item });
            succeededCount++;
          } catch (err) {
            failedRecords.push({ row: item, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      processedCount = Math.min(recordsToImport.length, i + batch.length);
    }

    isImporting = false;
    onSuccess?.({ succeeded: succeededCount, failed: failedRecords.length });
  }

  function downloadErrors() {
    if (failedRecords.length === 0 || typeof document === 'undefined') return;
    const errorRows = failedRecords.map((f) => ({
      ...f.row,
      _error_reason: f.error,
    }));
    const csvContent = toCsv(errorRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resourceName}-import-errors.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    currentStep = 1;
    fileName = '';
    rawHeaders = [];
    rawRows = [];
    columnMapping = {};
    processedCount = 0;
    succeededCount = 0;
    failedRecords = [];
    isImporting = false;
  }
</script>

{#if open}
  <Dialog.Dialog bind:open>
    <Dialog.DialogContent class="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle class="flex items-center gap-2">
          <FileSpreadsheet class="h-5 w-5 text-primary" />
          <span>{i18n.t('common.import', { defaultValue: 'Import' })} {resource.label}</span>
        </Dialog.DialogTitle>
      </Dialog.DialogHeader>

      <!-- Step Indicator -->
      <div class="flex items-center justify-between text-xs font-medium text-muted-foreground pb-2 border-b border-border/50">
        <span class={currentStep === 1 ? 'text-primary font-semibold' : ''}>1. {i18n.t('common.uploadFile', { defaultValue: 'Upload File' })}</span>
        <span>→</span>
        <span class={currentStep === 2 ? 'text-primary font-semibold' : ''}>2. {i18n.t('common.mapColumns', { defaultValue: 'Map Columns' })}</span>
        <span>→</span>
        <span class={currentStep === 3 ? 'text-primary font-semibold' : ''}>3. {i18n.t('common.importProgress', { defaultValue: 'Import & Verify' })}</span>
      </div>

      <!-- Step 1: Upload -->
      {#if currentStep === 1}
        <div
          class="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-8 text-center transition-colors cursor-pointer bg-muted/20"
          ondragover={(e) => e.preventDefault()}
          ondrop={handleDrop}
          role="region"
          aria-label="Upload Dropzone"
        >
          <Upload class="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <p class="text-sm font-medium text-foreground mb-1">
            {i18n.t('common.dropFileHere', { defaultValue: 'Drag and drop CSV or JSON file here' })}
          </p>
          <p class="text-xs text-muted-foreground mb-4">
            {i18n.t('common.fileFormatHint', { defaultValue: 'Supports .csv, .json with UTF-8 encoding' })}
          </p>
          <label class="inline-flex">
            <input
              type="file"
              accept=".csv,.json"
              class="hidden"
              onchange={(e) => {
                const target = e.currentTarget;
                if (target.files?.[0]) handleFileSelect(target.files[0]);
              }}
            />
            <span class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 cursor-pointer">
              {i18n.t('common.selectFile', { defaultValue: 'Browse File' })}
            </span>
          </label>
        </div>
      {/if}

      <!-- Step 2: Column Mapping -->
      {#if currentStep === 2}
        <div class="space-y-4">
          <div class="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
            <span>{i18n.t('common.detectedRows', { defaultValue: 'Detected' })}: <strong class="text-foreground">{rawRows.length}</strong> {i18n.t('common.records', { defaultValue: 'records' })}</span>
            <Badge variant="secondary" class="text-[11px] font-mono">{fileName}</Badge>
          </div>

          <div class="max-h-72 overflow-y-auto space-y-2 pr-1 border border-border/40 rounded-lg p-2">
            {#each rawHeaders as header (header)}
              <div class="flex items-center justify-between gap-3 p-2 rounded-md bg-card border border-border/40 text-xs">
                <div class="flex-1 truncate">
                  <span class="font-medium text-foreground">{header}</span>
                  {#if rawRows[0]}
                    <span class="block text-[11px] text-muted-foreground truncate opacity-70">
                      Sample: {rawRows[0][rawHeaders.indexOf(header)] ?? '—'}
                    </span>
                  {/if}
                </div>
                <div class="w-48 shrink-0">
                  <select
                    class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    bind:value={columnMapping[header]}
                  >
                    <option value="">— {i18n.t('common.ignoreColumn', { defaultValue: 'Ignore' })} —</option>
                    {#each availableFields as field (field.key)}
                      <option value={field.key}>
                        {field.label} ({field.key}) {field.required ? '*' : ''}
                      </option>
                    {/each}
                  </select>
                </div>
              </div>
            {/each}
          </div>

          <div class="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onclick={() => { currentStep = 1; }}>
              <ArrowLeft class="h-3.5 w-3.5 mr-1" />
              {i18n.t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Button size="sm" onclick={startImport}>
              {i18n.t('common.startImport', { defaultValue: 'Start Import' })}
              <ArrowRight class="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      {/if}

      <!-- Step 3: Progress & Summary -->
      {#if currentStep === 3}
        <div class="space-y-5 py-2">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{isImporting ? i18n.t('common.importing', { defaultValue: 'Importing...' }) : i18n.t('common.completed', { defaultValue: 'Completed' })}</span>
              <span class="font-semibold text-foreground tabular-nums">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} class="h-2" />
          </div>

          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="p-3 rounded-lg bg-success/10 border border-success/20">
              <span class="text-xs text-muted-foreground block">{i18n.t('common.succeeded', { defaultValue: 'Succeeded' })}</span>
              <span class="text-xl font-bold text-success tabular-nums">{succeededCount}</span>
            </div>
            <div class="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <span class="text-xs text-muted-foreground block">{i18n.t('common.failed', { defaultValue: 'Failed' })}</span>
              <span class="text-xl font-bold text-destructive tabular-nums">{failedRecords.length}</span>
            </div>
          </div>

          {#if failedRecords.length > 0}
            <div class="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/15 text-xs">
              <div class="flex items-center gap-2 text-destructive">
                <AlertCircle class="h-4 w-4" />
                <span>{failedRecords.length} {i18n.t('common.failedRowsHint', { defaultValue: 'records failed to import.' })}</span>
              </div>
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={downloadErrors}>
                <Download class="h-3.5 w-3.5" />
                {i18n.t('common.downloadErrors', { defaultValue: 'Download Failed CSV' })}
              </Button>
            </div>
          {/if}

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
            {#if !isImporting}
              <Button variant="outline" size="sm" onclick={reset}>
                {i18n.t('common.importAnother', { defaultValue: 'Import Another' })}
              </Button>
              <Button size="sm" onclick={() => { open = false; }}>
                {i18n.t('common.close', { defaultValue: 'Close' })}
              </Button>
            {:else}
              <Button size="sm" disabled class="gap-2">
                <Loader2 class="h-3.5 w-3.5 animate-spin" />
                {i18n.t('common.processing', { defaultValue: 'Processing...' })}
              </Button>
            {/if}
          </div>
        </div>
      {/if}
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}
