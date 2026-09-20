<script lang="ts">
  import { captureAdminContext, captureAuthSession, IMPORT_LIMITS, snapshotImportArtifact, snapshotImportTaskResult, useCan, useImport, useResourceContract, useSubmitTask, useTask } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { parseContractCreateInput } from '@svadmin/core/resource-contract';
  import type { ImportArtifactProvider, TaskProvider } from '@svadmin/core';
  import { normalizeTaskStatus, resolveTaskProgress, canCancelTask } from './task-utils.js';
  import TaskStatusBadge from './TaskStatusBadge.svelte';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import { parseCSV, toCsv } from '@svadmin/core';
  import * as Dialog from './ui/dialog/index.js';
  import { Button } from './ui/button/index.js';
  import { Progress } from './ui/progress/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Upload, ArrowRight, ArrowLeft, AlertCircle, Download, FileSpreadsheet, Loader2, RotateCw } from '@lucide/svelte';

  interface Props {
    resourceName: string;
    open?: boolean;
    batchSize?: number;
    maxRows?: number;
    maxBytes?: number;
    taskName?: string;
    retryTaskName?: string;
    taskProvider?: TaskProvider;
    /** 上传原文件并以 artifact 引用提交任务，避免任务请求重复携带 records。 */
    taskArtifactProvider?: ImportArtifactProvider;
    taskIdempotencyKey?: string;
    initialTaskId?: string;
    onTaskSubmitted?: (taskId: string) => void;
    onSuccess?: (result: { succeeded: number; failed: number }) => void;
  }

  let {
    resourceName,
    open = $bindable(false),
    batchSize = 20,
    maxRows = IMPORT_LIMITS.maxRows,
    maxBytes = IMPORT_LIMITS.maxBytes,
    taskName,
    retryTaskName,
    taskProvider,
    taskArtifactProvider,
    taskIdempotencyKey,
    initialTaskId,
    onTaskSubmitted,
    onSuccess,
  }: Props = $props();

  const i18n = useTranslation();
  const context = captureAdminContext();
  const binding = useResourceContract(() => resourceName);
  const resource = $derived(context.getResource(resourceName));
  const can = useCan(() => ({ resource: resourceName, action: 'import' }));
  const session = $derived(captureAuthSession(context.authProvider));
  const allowed = $derived(can.allowed === true && resource.canCreate !== false && session.available);
  const activeTaskProvider = $derived(taskProvider ?? context.taskProvider);
  const scope = $derived({
    contract: binding.resource, provider: context.providers?.[binding.dataProviderName],
    tenant: context.tenantCacheKey?.__svadminTenant, meta: binding.meta,
    auth: context.authProvider, router: context.routerProvider, session, allowed,
    taskProvider: activeTaskProvider, taskName, retryTaskName, taskIdempotencyKey, taskArtifactProvider,
    access: context.accessControlProvider,
  });
  const availableFields = $derived(
    resource.fields.filter((f) => f.key !== (resource.primaryKey ?? 'id') && f.showInForm !== false)
  );

  let currentStep = $state<1 | 2 | 3>(1);
  let fileName = $state('');
  let selectedFile = $state<File | null>(null);
  let rawHeaders = $state<string[]>([]);
  let rawRows = $state<unknown[][]>([]);
  let columnMapping = $state<Record<string, string>>({}); // header -> fieldKey or ''
  let fileError = $state<string | null>(null);
  let importError = $state<string | null>(null);
  let parseToken = 0;
  let mounted = true;
  let cancelled = $state(false);
  let durableTaskId = $state<string | undefined>(untrack(() => initialTaskId));
  let durableTaskScope = $state.raw<typeof scope | undefined>(untrack(() => scope));
  const ownedTaskId = $derived(durableTaskScope && sameScope(durableTaskScope, scope) ? durableTaskId : undefined);
  let durableHandledTaskId = $state<string | undefined>();
  let durableSubmitAttempt = $state.raw<object | undefined>();
  let artifactUploadController: AbortController | undefined;
  let durablePolling = $state(true);
  const durableMode = $derived(taskName !== undefined);
  const submitTask = useSubmitTask();
  const taskQuery = useTask(definedReactiveOptions({
    get taskId() { return ownedTaskId; },
    get taskProvider() { return activeTaskProvider; },
    get queryOptions() {
      return {
        enabled: open && allowed && durableMode && !!activeTaskProvider && !!ownedTaskId,
        refetchInterval: open && allowed && durableMode && ownedTaskId && durablePolling ? 2000 : false as const,
        refetchOnWindowFocus: true,
      };
    },
  }));
  const durableStatus = $derived(normalizeTaskStatus(taskQuery.data?.status));
  const retryReceipt = $derived(durableStatus === 'completed'
    ? snapshotImportTaskResult(taskQuery.data?.result ?? taskQuery.data?.result_data)?.retry : undefined);
  const durableActive = $derived(durableStatus === 'queued' || durableStatus === 'processing'
    || !!durableSubmitAttempt);

  let importResult = $state<{ succeeded: number; failed: number } | null>(null);
  let succeededCount = $state(0);
  let failedRecords = $state<Array<{ row: Record<string, unknown>; error: string }>>([]);

  const importer = useImport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get batchSize() { return batchSize; },
    get maxRows() { return maxRows; },
    get maxBytes() { return maxBytes; },
    get enabled() { return open && allowed; },
    mapData: mapRow,
  }));
  const isImporting = $derived(importer.isLoading || durableActive);
  const processedCount = $derived(importer.progress.processedAmount);
  const totalCount = $derived(importer.progress.totalAmount || rawRows.length);
  const progressPercent = $derived(
    totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : 0
  );

  async function handleFileSelect(file: File) {
    if (!open || !allowed || isImporting) return;
    const origin = scope;
    const token = ++parseToken;
    fileError = null;
    importError = null;
    durableTaskId = undefined;
    durableHandledTaskId = undefined;
    durableSubmitAttempt = undefined;
    selectedFile = null;
    fileName = file.name;
    rawHeaders = [];
    rawRows = [];
    columnMapping = {};
    try {
      if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > IMPORT_LIMITS.maxRows
        || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > IMPORT_LIMITS.maxBytes) {
        throw new Error(i18n.t('import.invalidLimits'));
      }
      if (file.size > maxBytes) throw new Error(i18n.t('import.limit'));
      const text = await file.text();
      if (!current(origin, token)) return;
      if (text.length > maxBytes) throw new Error(i18n.t('import.limit'));
      const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

      if (file.name.toLowerCase().endsWith('.json')) {
        const json: unknown = JSON.parse(cleanText);
        if (Array.isArray(json) && json.length > maxRows) throw new Error(i18n.t('import.limit'));
        if (!Array.isArray(json) || json.length === 0 || json.some((item) => (
          typeof item !== 'object' || item === null || Array.isArray(item)
        ))) {
          throw new Error('The JSON file must contain a non-empty array of records.');
        }
        const records = json as Record<string, unknown>[];
        if (records.length > maxRows) throw new Error(i18n.t('import.limit'));
        const keys = [...new Set(records.flatMap(item => Object.keys(item)))];
        if (keys.length === 0) throw new Error('The import file has no columns.');
        rawHeaders = keys;
        rawRows = records.map((item) => keys.map((key) => item[key]));
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const rows = parseCSV(cleanText);
        const firstRow = rows[0];
        if (!firstRow || firstRow.length === 0 || firstRow.every((cell) => !cell.trim())) {
          throw new Error('The CSV file has no header row.');
        }
        if (firstRow.some(header => !header.trim()) || new Set(firstRow).size !== firstRow.length) {
          throw new Error('CSV column names must be non-empty and unique.');
        }
        const records = rows.slice(1).filter((r: string[]) =>
          r.some((cell: string) => cell.trim().length > 0));
        if (records.length === 0) throw new Error('The import file has no records.');
        if (records.length > maxRows) throw new Error(i18n.t('import.limit'));
        if (records.some((row) => row.length !== firstRow.length)) {
          throw new Error('The CSV file contains rows with inconsistent column counts.');
        }
        rawHeaders = firstRow;
        rawRows = records;
      } else {
        throw new Error('Only CSV and JSON files are supported.');
      }

      if (!current(origin, token)) return;
      selectedFile = file;
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
    } catch (error) {
      if (!current(origin, token)) return;
      fileError = error instanceof Error ? error.message : 'Unable to read the import file.';
      currentStep = 1;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function mapRow(row: Record<string, unknown>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    rawHeaders.forEach((header) => {
      const targetFieldKey = columnMapping[header];
      if (!targetFieldKey) return;
      const fieldDef = availableFields.find((f) => f.key === targetFieldKey);
      let val: unknown = row[header];
      if (typeof val === 'string') {
        if (fieldDef?.type === 'number' || fieldDef?.type === 'currency' || fieldDef?.type === 'percent') {
          const num = val.trim() === '' ? NaN : Number(val);
          val = val.trim() === '' ? undefined : Number.isFinite(num) ? num : val;
        } else if (fieldDef?.type === 'boolean') {
          const normalized = val.trim().toLowerCase();
          if (['true', '1', 'yes', '是'].includes(normalized)) val = true;
          else if (['false', '0', 'no', '否'].includes(normalized)) val = false;
        } else if (fieldDef?.type === 'select' && fieldDef.options && selectedFile?.name.toLowerCase().endsWith('.csv')) {
          const matches = fieldDef.options.filter(option => String(option.value) === val);
          if (matches.length !== 1 || matches[0]!.disabled) throw new Error('Invalid import option.');
          val = matches[0]!.value;
        } else if (fieldDef?.type === 'json' && selectedFile?.name.toLowerCase().endsWith('.csv')) {
          val = JSON.parse(val);
        }
      }
      if (val !== undefined) {
        Object.defineProperty(record, targetFieldKey, { value: val, enumerable: true });
      }
    });
    return record;
  }

  function validateMappedRows(): string | null {
    for (const [index, source] of rawRows.entries()) {
      try {
        const mapped = mapRow(Object.fromEntries(rawHeaders.map((header, column) => [header, source[column]])));
        parseContractCreateInput(binding.resource, mapped);
      } catch {
        return i18n.t('import.invalidRow', { row: index + 1 });
      }
    }
    return null;
  }

  async function startImport() {
    if (!selectedFile || rawRows.length === 0 || isImporting || !open || !allowed) return;
    if (durableMode && (!activeTaskProvider || !taskName?.trim() || !taskIdempotencyKey?.trim())) {
      fileError = i18n.t('import.taskConfiguration');
      return;
    }
    const targets = Object.values(columnMapping).filter(Boolean);
    if (targets.length === 0 || new Set(targets).size !== targets.length) {
      fileError = 'Map at least one column, and use each target field only once.';
      return;
    }
    const mappingError = validateMappedRows();
    if (mappingError) {
      fileError = mappingError;
      return;
    }
    const origin = scope;
    const token = parseToken;
    const notifySuccess = onSuccess;
    currentStep = 3;
    succeededCount = 0;
    failedRecords = [];
    importResult = null;
    importError = null;
    cancelled = false;
    if (durableMode) {
      if (durableTaskId || durableSubmitAttempt) return;
      const attempt = {};
      durableSubmitAttempt = attempt;
      const uploadController = new AbortController();
      artifactUploadController = uploadController;
      try {
        if (!activeTaskProvider || !taskName?.trim() || !taskIdempotencyKey?.trim()) {
          throw new Error(i18n.t('import.taskConfiguration'));
        }
        const records = taskArtifactProvider ? undefined : rawRows.map((source, index) => {
          const mapped = mapRow(Object.fromEntries(rawHeaders.map((header, column) => [header, source[column]])));
          try { return parseContractCreateInput(binding.resource, mapped); }
          catch { throw new Error(i18n.t('import.invalidRow', { row: index + 1 })); }
        });
        const uploaded = taskArtifactProvider
          ? snapshotImportArtifact(await taskArtifactProvider.upload({
            file: selectedFile,
            fileName,
            size: selectedFile.size,
            resource: binding.resource.name,
            idempotencyKey: JSON.stringify(['import-artifact', taskIdempotencyKey]),
            signal: uploadController.signal,
          }))
          : undefined;
        if (durableSubmitAttempt !== attempt || !current(origin, token) || uploadController.signal.aborted) return;
        if (taskArtifactProvider && !uploaded) throw new Error(i18n.t('import.taskPayloadLimit'));
        if (uploaded && (uploaded.size !== selectedFile.size || uploaded.fileName !== fileName)) {
          throw new Error(i18n.t('import.taskPayloadLimit'));
        }
        const body = uploaded ? {
          protocolVersion: 2,
          resource: binding.resource.name,
          fileName,
          mapping: { ...columnMapping },
          artifact: uploaded,
        } : {
          protocolVersion: 1,
          resource: binding.resource.name,
          fileName,
          mapping: { ...columnMapping },
          records,
        };
        const encoded = JSON.stringify(body);
        if (new TextEncoder().encode(encoded).byteLength > maxBytes) {
          fileError = i18n.t('import.taskPayloadLimit');
          currentStep = 2;
          return;
        }
        const handle = await submitTask.mutation.mutateAsync({
          taskName: taskName.trim(),
          taskProvider: activeTaskProvider,
          successNotification: false,
          errorNotification: false,
          options: {
            body,
            idempotencyKey: taskIdempotencyKey,
            ...(binding.meta === undefined ? {} : { meta: binding.meta }),
          },
        });
        if (durableSubmitAttempt !== attempt || !current(origin, token)) return;
        durableTaskId = handle.id;
        durableTaskScope = scope;
        durableHandledTaskId = undefined;
        currentStep = 3;
        try { void Promise.resolve(onTaskSubmitted?.(handle.id)).catch(() => {}); }
        catch { /* 观察者失败不重发任务。 */ }
      } catch {
        if (durableSubmitAttempt !== attempt || !current(origin, token)) return;
        importError = i18n.t('import.taskUnconfirmed');
      } finally {
        if (artifactUploadController === uploadController) artifactUploadController = undefined;
        if (durableSubmitAttempt === attempt) durableSubmitAttempt = undefined;
      }
      return;
    }
    try {
      const result = await importer.handleChange({ file: selectedFile });
      if (!current(origin, token)) return;
      succeededCount = result.succeeded.length;
      failedRecords = result.errored.map(item => ({
        row: item.request as Record<string, unknown>,
        error: item.error.message,
      }));
      importResult = { succeeded: succeededCount, failed: failedRecords.length };
    } catch (error) {
      if (!current(origin, token)) return;
      importError = error instanceof Error ? error.message : 'Import failed.';
      importResult = null;
    }
    if (importResult) {
      try { notifySuccess?.(importResult); }
      catch { /* 消费方回调失败不能把已完成的写入改判为导入失败。 */ }
    }
  }

  function current(origin: typeof scope, token: number): boolean {
    return mounted && open && allowed && sameScope(origin, scope) && origin.session.isCurrent() && token === parseToken;
  }

  function sameScope(left: typeof scope, right: typeof scope): boolean {
    return left.contract === right.contract && left.provider === right.provider &&
      left.tenant === right.tenant && JSON.stringify(left.meta) === JSON.stringify(right.meta) &&
      left.auth === right.auth && left.session.cacheKey === right.session.cacheKey &&
      left.router === right.router && left.access === right.access &&
      left.taskProvider === right.taskProvider && left.taskArtifactProvider === right.taskArtifactProvider &&
      left.taskName === right.taskName && left.retryTaskName === right.retryTaskName &&
      left.taskIdempotencyKey === right.taskIdempotencyKey;
  }

  async function retryFailedRows(): Promise<void> {
    const receipt = retryReceipt;
    const parentTaskId = ownedTaskId;
    if (!open || !allowed || !receipt || !parentTaskId || !retryTaskName?.trim()
      || !activeTaskProvider || durableSubmitAttempt || taskQuery.isError) return;
    const origin = scope;
    const token = parseToken;
    const attempt = {};
    durableSubmitAttempt = attempt;
    importError = null;
    try {
      // 同一父任务和不可变回执始终使用同一键；未知提交结果不得转成新写入。
      const handle = await submitTask.mutation.mutateAsync({
        taskName: retryTaskName.trim(),
        taskProvider: activeTaskProvider,
        successNotification: false,
        errorNotification: false,
        options: {
          idempotencyKey: JSON.stringify(['import-failed-rows', parentTaskId, receipt.receiptId]),
          body: {
            protocolVersion: 1,
            operation: 'retry-failed-rows',
            resource: binding.resource.name,
            parentTaskId,
            receiptId: receipt.receiptId,
            rows: [...receipt.rows].sort((a, b) => a - b),
          },
          ...(binding.meta === undefined ? {} : { meta: binding.meta }),
        },
      });
      if (durableSubmitAttempt !== attempt || !current(origin, token)) return;
      if (handle.id === parentTaskId) throw new Error('Retry must create a child task');
      durableTaskId = handle.id;
      durableTaskScope = scope;
      durableHandledTaskId = undefined;
      durablePolling = true;
      importResult = null;
      try { void Promise.resolve(onTaskSubmitted?.(handle.id)).catch(() => {}); }
      catch { /* 通知失败不重复提交。 */ }
    } catch {
      if (durableSubmitAttempt === attempt && current(origin, token)) importError = i18n.t('import.taskUnconfirmed');
    } finally {
      if (durableSubmitAttempt === attempt) durableSubmitAttempt = undefined;
    }
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
    const safeResourceName = resourceName.replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^[._-]+/, '').slice(0, 100).replace(/[._-]+$/, '') || 'resource';
    link.download = `${safeResourceName}-import-errors.csv`;
    try {
      link.click();
    } finally {
      // 浏览器需要在 click 返回后仍能读取对象 URL，延迟回收避免空下载。
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }

  function reset() {
    artifactUploadController?.abort();
    artifactUploadController = undefined;
    parseToken += 1;
    currentStep = 1;
    fileName = '';
    selectedFile = null;
    rawHeaders = [];
    rawRows = [];
    columnMapping = {};
    succeededCount = 0;
    failedRecords = [];
    importResult = null;
    fileError = null;
    importError = null;
    cancelled = false;
    durableSubmitAttempt = undefined;
    durableHandledTaskId = undefined;
    durablePolling = true;
    importer.reset();
  }

  function cancelImport() {
    if (durableMode && durableTaskId && durableActive) return;
    if (!isImporting) return;
    // 废弃 UI 回执与核心执行令牌；已经发出的请求并不因此回滚。
    parseToken++;
    artifactUploadController?.abort();
    artifactUploadController = undefined;
    durableSubmitAttempt = undefined;
    importer.reset();
    cancelled = true;
    importResult = null;
    importError = null;
  }

  let observedScope = untrack(() => scope);
  let observedOpen = untrack(() => open);
  $effect.pre(() => {
    const changed = !sameScope(observedScope, scope) || (observedScope.allowed && !allowed);
    if (changed) {
      durableTaskId = undefined;
      durableTaskScope = undefined;
      durableHandledTaskId = undefined;
    }
    if (changed || observedOpen !== open) untrack(reset);
    observedScope = scope;
    observedOpen = open;
  });
  $effect(() => {
    const task = taskQuery.data;
    if (!open || !allowed || !durableTaskId || !task || durableHandledTaskId === durableTaskId) return;
    if (!['completed', 'failed', 'cancelled'].includes(durableStatus)) return;
    durableHandledTaskId = durableTaskId;
    durablePolling = false;
    if (durableStatus === 'completed') {
      const result = snapshotImportTaskResult(task.result ?? task.result_data);
      if (result) {
        succeededCount = result.succeeded;
        importResult = { succeeded: result.succeeded, failed: result.failed };
        try { void Promise.resolve(onSuccess?.(importResult)).catch(() => {}); }
        catch { /* 任务完成通知失败不改变服务端任务结果。 */ }
      } else {
        importError = i18n.t('import.invalidTaskResult');
      }
    } else if (durableStatus === 'failed' || durableStatus === 'cancelled') {
      importError = i18n.t('common.operationFailed');
      importResult = null;
    }
  });
  $effect(() => () => { mounted = false; parseToken += 1; artifactUploadController?.abort(); });
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
      {#if !allowed}
        <p role="status">{i18n.t('common.operationFailed', { defaultValue: 'Import is unavailable.' })}</p>
      {/if}
      {#if durableMode && (durableTaskId || durableSubmitAttempt || currentStep === 3)}
        {#if durableTaskId}
          <p>{durableTaskId}</p>
          {#if taskQuery.isError}
            <p role="alert">{i18n.t('task.fetchFailed')}</p>
            <Button type="button" onclick={() => taskQuery.refetch()}>{i18n.t('common.retry')}</Button>
          {:else if taskQuery.data && allowed}
            <TaskStatusBadge status={taskQuery.data.status} />
            {#if resolveTaskProgress(taskQuery.data) !== undefined}
              <Progress value={resolveTaskProgress(taskQuery.data)} />
            {/if}
            {#if importResult}
              <p role="status">{i18n.t('common.succeeded')}: {importResult.succeeded};
                {i18n.t('common.failed')}: {importResult.failed}</p>
            {/if}
            {#if retryReceipt && retryTaskName?.trim()}
              <Button type="button" disabled={!allowed || !!durableSubmitAttempt}
                onclick={retryFailedRows}><RotateCw aria-hidden="true" />{i18n.t('import.retryFailedRows')}</Button>
            {/if}
            {#if activeTaskProvider?.cancel && canCancelTask(taskQuery.data)}
              <CancelTaskButton taskId={durableTaskId} taskProvider={activeTaskProvider}
                disabled={!allowed || !open}
                onSuccess={() => { void taskQuery.refetch(); }}
                onError={() => { importError = i18n.t('common.operationFailed'); }} />
            {/if}
          {:else}
            <p role="status">{i18n.t('common.loading')}</p>
          {/if}
        {:else if durableSubmitAttempt}
          <p role="status">{i18n.t('common.processing')}</p>
        {/if}
        {#if importError}<p role="alert">{importError}</p>{/if}
        <Button type="button" onclick={() => { open = false; }}>{i18n.t('common.close')}</Button>
      {:else if currentStep === 1}
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
              disabled={!allowed}
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
          {#if fileError}
            <p role="alert">{fileError}</p>
          {/if}
        </div>
      {/if}

      <!-- Step 2: Column Mapping -->
      {#if currentStep === 2 && !durableTaskId}
        <div class="svadmin-u-3e7ce58d64fa">
          {#if fileError}<p role="alert">{fileError}</p>{/if}
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
                    aria-label={`Map ${header}`}
                    class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                    value={columnMapping[header]}
                    onchange={(event) => {
                      columnMapping = { ...columnMapping, [header]: event.currentTarget.value };
                      fileError = null;
                    }}
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
            <Button size="sm" disabled={!allowed || isImporting} onclick={startImport}>
              {i18n.t('common.startImport', { defaultValue: 'Start Import' })}
              <ArrowRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-f58b02572ab2" />
            </Button>
          </div>
        </div>
      {/if}

      <!-- Step 3: Progress & Summary -->
      {#if currentStep === 3 && !durableMode}
        <div class="svadmin-u-b43b4c086d9a svadmin-u-03b4dd7f172b">
          <div class="svadmin-u-6f7e013d6499">
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-359090c2d529">
              <span class="svadmin-u-bfa603190748">{cancelled ? i18n.t('import.stopped') : isImporting ? i18n.t('common.importing', { defaultValue: 'Importing...' }) : importError ? i18n.t('common.operationFailed', { defaultValue: 'Import failed' }) : i18n.t('common.completed', { defaultValue: 'Completed' })}</span>
              {#if !cancelled}<span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-3032cae0badb">{progressPercent}%</span>{/if}
            </div>
            {#if !cancelled}<Progress value={progressPercent} class="svadmin-u-2f2a842e50fa" />{/if}
          </div>

          {#if cancelled}
            <p role="status">{i18n.t('import.stoppedHint')}</p>
          {:else}
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
          {/if}

          {#if importError}
            <p role="alert">{importError}</p>
          {/if}

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
              <Button variant="outline" size="sm" onclick={cancelImport}>{i18n.t('common.cancel')}</Button>
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
