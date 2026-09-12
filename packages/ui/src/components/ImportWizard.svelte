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
      const firstRow = rows[0];
      if (firstRow) {
        rawHeaders = firstRow;
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
    <Dialog.DialogContent class="svadmin-u-fde8b650ab2d svadmin-u-c3c9f24b386b svadmin-u-92bf82f493b1">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
          <FileSpreadsheet class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-20aaf08a7ed1" />
          <span>{i18n.t('common.import', { defaultValue: 'Import' })} {resource.label}</span>
        </Dialog.DialogTitle>
      </Dialog.DialogHeader>

      <!-- Step Indicator -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-591f378e24a1">
        <span class={currentStep === 1 ? 'svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91' : ''}>1. {i18n.t('common.uploadFile', { defaultValue: 'Upload File' })}</span>
        <span>→</span>
        <span class={currentStep === 2 ? 'svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91' : ''}>2. {i18n.t('common.mapColumns', { defaultValue: 'Map Columns' })}</span>
        <span>→</span>
        <span class={currentStep === 3 ? 'svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91' : ''}>3. {i18n.t('common.importProgress', { defaultValue: 'Import & Verify' })}</span>
      </div>

      <!-- Step 1: Upload -->
      {#if currentStep === 1}
        <div
          class="svadmin-u-65935df577ba svadmin-u-a29b7a649c77 svadmin-u-c9ed8c5f79ae svadmin-u-8b9d5d768973 svadmin-u-a217b4eaa918 svadmin-u-845f53365c8d svadmin-u-ca6bf63030aa svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-967d113a1451"
          ondragover={(e) => e.preventDefault()}
          ondrop={handleDrop}
          role="region"
          aria-label="Upload Dropzone"
        >
          <Upload class="svadmin-u-426b8b75185b svadmin-u-d854e5698b57 svadmin-u-0e12dc7de920 svadmin-u-7be4d67a6256 svadmin-u-1bb883263ed2" />
          <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-65281709dacf">
            {i18n.t('common.dropFileHere', { defaultValue: 'Drag and drop CSV or JSON file here' })}
          </p>
          <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-da019856f2cc">
            {i18n.t('common.fileFormatHint', { defaultValue: 'Supports .csv, .json with UTF-8 encoding' })}
          </p>
          <label class="svadmin-u-52083e7da442">
            <input
              type="file"
              accept=".csv,.json"
              class="svadmin-u-99d72c7fc3e2"
              onchange={(e) => {
                const target = e.currentTarget;
                if (target.files?.[0]) handleFileSelect(target.files[0]);
              }}
            />
            <span class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-75b1bec3ea0e svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-30ca335ae9c2 svadmin-u-ed9d3d832af8 svadmin-u-7bfcf1d0e0fa svadmin-u-34516836730d">
              {i18n.t('common.selectFile', { defaultValue: 'Browse File' })}
            </span>
          </label>
        </div>
      {/if}

      <!-- Step 2: Column Mapping -->
      {#if currentStep === 2}
        <div class="svadmin-u-3e7ce58d64fa">
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-2859c861d7de svadmin-u-9fe52d5d506c svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
            <span>{i18n.t('common.detectedRows', { defaultValue: 'Detected' })}: <strong class="svadmin-u-d4108abe6359">{rawRows.length}</strong> {i18n.t('common.records', { defaultValue: 'records' })}</span>
            <Badge variant="secondary" class="svadmin-u-d058ca6de60f svadmin-u-0e65706bcccd">{fileName}</Badge>
          </div>

          <div class="svadmin-u-ff4d2db0e22a svadmin-u-92bf82f493b1 svadmin-u-6f7e013d6499 svadmin-u-eda955402ba6 svadmin-u-ca6bcd4b6f3f svadmin-u-6ee2d41e2d2d svadmin-u-5f22e64f2282 svadmin-u-7660b450905a">
            {#each rawHeaders as header (header)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-7660b450905a svadmin-u-421ac2be5045 svadmin-u-cd0ad9a56558 svadmin-u-ca6bcd4b6f3f svadmin-u-6ee2d41e2d2d svadmin-u-359090c2d529">
                <div class="svadmin-u-36e579c0b41c svadmin-u-f283ea9bea0e">
                  <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{header}</span>
                  {#if rawRows[0]}
                    <span class="svadmin-u-0214b4b355d1 svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-f283ea9bea0e svadmin-u-0c67ca474a69">
                      Sample: {rawRows[0][rawHeaders.indexOf(header)] ?? '—'}
                    </span>
                  {/if}
                </div>
                <div class="svadmin-u-74b2435a1d40 svadmin-u-012fbd121f37">
                  <select
                    class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
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

          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-f46b61a9b310">
            <Button variant="outline" size="sm" onclick={() => { currentStep = 1; }}>
              <ArrowLeft class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-618162408e7a" />
              {i18n.t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Button size="sm" onclick={startImport}>
              {i18n.t('common.startImport', { defaultValue: 'Start Import' })}
              <ArrowRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-f58b02572ab2" />
            </Button>
          </div>
        </div>
      {/if}

      <!-- Step 3: Progress & Summary -->
      {#if currentStep === 3}
        <div class="svadmin-u-b43b4c086d9a svadmin-u-03b4dd7f172b">
          <div class="svadmin-u-6f7e013d6499">
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-359090c2d529">
              <span class="svadmin-u-bfa603190748">{isImporting ? i18n.t('common.importing', { defaultValue: 'Importing...' }) : i18n.t('common.completed', { defaultValue: 'Completed' })}</span>
              <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-3032cae0badb">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} class="svadmin-u-2f2a842e50fa" />
          </div>

          <div class="svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-1004c0c3954c svadmin-u-ca6bf63030aa">
            <div class="svadmin-u-eb6e8b881acd svadmin-u-5f22e64f2282 svadmin-u-17a9f7af2265 svadmin-u-ca6bcd4b6f3f svadmin-u-95b7dea5a67f">
              <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0214b4b355d1">{i18n.t('common.succeeded', { defaultValue: 'Succeeded' })}</span>
              <span class="svadmin-u-d5c9b0001e7e svadmin-u-69450ef1487e svadmin-u-76747e5e02ff svadmin-u-3032cae0badb">{succeededCount}</span>
            </div>
            <div class="svadmin-u-eb6e8b881acd svadmin-u-5f22e64f2282 svadmin-u-43928fcc832f svadmin-u-ca6bcd4b6f3f svadmin-u-f0c1e65bd6f2">
              <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0214b4b355d1">{i18n.t('common.failed', { defaultValue: 'Failed' })}</span>
              <span class="svadmin-u-d5c9b0001e7e svadmin-u-69450ef1487e svadmin-u-811148b13d1e svadmin-u-3032cae0badb">{failedRecords.length}</span>
            </div>
          </div>

          {#if failedRecords.length > 0}
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-eb6e8b881acd svadmin-u-5f22e64f2282 svadmin-u-7a0854fdbc30 svadmin-u-ca6bcd4b6f3f svadmin-u-e09a917c4c3b svadmin-u-359090c2d529">
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-811148b13d1e">
                <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                <span>{failedRecords.length} {i18n.t('common.failedRowsHint', { defaultValue: 'records failed to import.' })}</span>
              </div>
              <Button variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={downloadErrors}>
                <Download class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                {i18n.t('common.downloadErrors', { defaultValue: 'Download Failed CSV' })}
              </Button>
            </div>
          {/if}

          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77c08e015d14 svadmin-u-77a2a20e90d4 svadmin-u-ce335a8e4f56 svadmin-u-b950dda299d3 svadmin-u-591f378e24a1">
            {#if !isImporting}
              <Button variant="outline" size="sm" onclick={reset}>
                {i18n.t('common.importAnother', { defaultValue: 'Import Another' })}
              </Button>
              <Button size="sm" onclick={() => { open = false; }}>
                {i18n.t('common.close', { defaultValue: 'Close' })}
              </Button>
            {:else}
              <Button size="sm" disabled class="svadmin-u-77a2a20e90d4">
                <Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />
                {i18n.t('common.processing', { defaultValue: 'Processing...' })}
              </Button>
            {/if}
          </div>
        </div>
      {/if}
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}
