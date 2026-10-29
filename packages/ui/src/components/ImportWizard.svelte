<script lang="ts">
  import { captureAdminContext, captureAuthSession, IMPORT_LIMITS, invalidImportPreviewFailure, snapshotImportArtifact, snapshotImportTaskResult, useCan, useImport, useResourceContract, useSubmitTask, useTask } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { parseContractCreateInput } from '@svadmin/core/resource-contract';
  import type { ImportArtifactProvider, ImportPreviewResult, TaskProvider } from '@svadmin/core';
  import { normalizeTaskStatus, resolveTaskProgress, canCancelTask } from './task-utils.js';
  import TaskStatusBadge from './TaskStatusBadge.svelte';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import { parseCSV, toCsv } from '@svadmin/core';
  import * as Dialog from './ui/dialog/index.js';
  import { Button } from './ui/button/index.js';
  import { Progress } from './ui/progress/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Upload, ArrowRight, ArrowLeft, AlertCircle, Download, FileSpreadsheet, Loader2, RotateCw } from '@lucide/svelte';

  /** 仅用于标记文件读取或 JSON 语法异常，避免把浏览器原始诊断展示给用户。 */
  class ImportFileReadError extends Error {}

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
    /** 只做本地解析、映射和逐行校验，不调用 Provider 写入，也不提交、轮询或取消任务。 */
    dryRun?: boolean;
    /** 预览结果回调；接收隔离的只读快照，失败原因与失败报告一样只含安全通用文本。 */
    onPreview?: (result: ImportPreviewResult) => void;
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
    dryRun = false,
    onPreview,
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
  let durableTaskId = $state<string | undefined>(untrack(() => dryRun ? undefined : initialTaskId));
  let durableTaskScope = $state.raw<typeof scope | undefined>(untrack(() => dryRun ? undefined : scope));
  const ownedTaskId = $derived(!dryRun && durableTaskScope && sameScope(durableTaskScope, scope) ? durableTaskId : undefined);
  let durableHandledTaskId = $state<string | undefined>();
  let durableSubmitAttempt = $state.raw<object | undefined>();
  let artifactUploadController: AbortController | undefined;
  let durablePolling = $state(true);
  const durableMode = $derived(!dryRun && taskName !== undefined);
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
  const durableActive = $derived(!dryRun && (durableStatus === 'queued' || durableStatus === 'processing'
    || !!durableSubmitAttempt));

  let importResult = $state<{ succeeded: number; failed: number } | null>(null);
  let succeededCount = $state(0);
  let failedRecords = $state<Array<{ row: Record<string, unknown>; error: string }>>([]);
  let previewResult = $state.raw<ImportPreviewResult | null>(null);

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
    previewResult = null;
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
      const text = await readFileText(file);
      if (!current(origin, token)) return;
      if (text.length > maxBytes) throw new Error(i18n.t('import.limit'));
      const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

      if (file.name.toLowerCase().endsWith('.json')) {
        const json: unknown = parseImportJson(cleanText);
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
      fileError = error instanceof ImportFileReadError
        ? i18n.t('import.fileReadFailed')
        : error instanceof Error ? error.message : i18n.t('import.fileReadFailed');
      currentStep = 1;
    }
  }

  async function readFileText(file: File): Promise<string> {
    try {
      return await file.text();
    } catch {
      throw new ImportFileReadError();
    }
  }

  function parseImportJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      throw new ImportFileReadError();
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
          const match = matches[0];
          if (matches.length !== 1 || !match || match.disabled) throw new Error('Invalid import option.');
          val = match.value;
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

  function mapSourceRow(source: unknown[]): Record<string, unknown> {
    return mapRow(Object.fromEntries(rawHeaders.map((header, column) => [header, source[column]])));
  }

  function snapshotPreviewResult(result: ImportPreviewResult): ImportPreviewResult {
    const failedRows = result.failedRows.map(failure => Object.freeze({
      row: failure.row,
      error: failure.error,
    }));
    Object.freeze(failedRows);
    return Object.freeze({
      totalRows: result.totalRows,
      importableRows: result.importableRows,
      failedRows,
    });
  }

  function evaluateMappedRows(): ImportPreviewResult {
    const failedRows: ImportPreviewResult['failedRows'] = [];
    for (const [index, source] of rawRows.entries()) {
      try {
        parseContractCreateInput(binding.resource, mapSourceRow(source));
      } catch {
        failedRows.push(invalidImportPreviewFailure(index + 1));
      }
    }
    return snapshotPreviewResult({
      totalRows: rawRows.length,
      importableRows: rawRows.length - failedRows.length,
      failedRows,
    });
  }

  function firstInvalidMappedRow(): number | undefined {
    for (const [index, source] of rawRows.entries()) {
      try {
        parseContractCreateInput(binding.resource, mapSourceRow(source));
      } catch {
        return index + 1;
      }
    }
    return undefined;
  }

  function validateMappedRows(): string | null {
    const row = firstInvalidMappedRow();
    return row === undefined ? null : i18n.t('import.invalidRow', { row });
  }

  function previewImport() {
    if (!selectedFile || rawRows.length === 0 || isImporting || !open || !allowed) return;
    if (!dryRun && !onPreview) return;
    const targets = Object.values(columnMapping).filter(Boolean);
    if (targets.length === 0 || new Set(targets).size !== targets.length) {
      fileError = 'Map at least one column, and use each target field only once.';
      previewResult = null;
      return;
    }
    fileError = null;
    importError = null;
    previewResult = evaluateMappedRows();
    currentStep = 3;
    try {
      // 观察者只拿到隔离的只读快照；同步抛错或异步拒绝都不能改变已完成的本地预览。
      const observerSnapshot = snapshotPreviewResult(previewResult);
      void Promise.resolve(onPreview?.(observerSnapshot)).catch(() => {});
    } catch { /* 观察者失败不能改变已完成的本地预览结果。 */ }
  }

  async function startImport() {
    if (!selectedFile || rawRows.length === 0 || isImporting || !open || !allowed) return;
    if (dryRun) { previewImport(); return; }
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
    previewResult = null;
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
          try { return parseContractCreateInput(binding.resource, mapSourceRow(source)); }
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
        error: importFailureMessage(item.error, item.row),
      }));
      importResult = { succeeded: succeededCount, failed: failedRecords.length };
    } catch (error) {
      if (!current(origin, token)) return;
      importError = importFailureMessage(error);
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

  /** Core 的 HttpError.message 只用于诊断；界面仅按安全 code 选择本地化文案。 */
  function importFailureMessage(error: unknown, row?: number): string {
    let code: unknown;
    try {
      if (typeof error === 'object' && error !== null) {
        code = Object.getOwnPropertyDescriptor(error, 'code')?.value;
      }
    } catch { /* 错误对象属于不可信诊断来源。 */ }
    if (code === 'IMPORT_LIMIT_EXCEEDED') return i18n.t('import.limit');
    if (code === 'INVALID_RESOURCE_INPUT') {
      const failedRow = row ?? failureRow(error);
      if (failedRow !== undefined) return i18n.t('import.invalidRow', { row: failedRow });
    }
    return i18n.t('common.operationFailed', { defaultValue: 'Import failed' });
  }

  function failureRow(error: unknown): number | undefined {
    try {
      if (typeof error !== 'object' || error === null) return undefined;
      const details: unknown = Object.getOwnPropertyDescriptor(error, 'details')?.value;
      if (typeof details !== 'object' || details === null) return undefined;
      const row: unknown = Object.getOwnPropertyDescriptor(details, 'row')?.value;
      return typeof row === 'number' && Number.isSafeInteger(row) && row >= 1 && row <= maxRows
        ? row : undefined;
    } catch { return undefined; }
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
    previewResult = null;
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
  let observedDryRun = untrack(() => dryRun);
  $effect.pre(() => {
    const changed = !sameScope(observedScope, scope) || (observedScope.allowed && !allowed)
      || observedDryRun !== dryRun;
    if (changed) {
      durableTaskId = undefined;
      durableTaskScope = undefined;
      durableHandledTaskId = undefined;
      durableSubmitAttempt = undefined;
      artifactUploadController?.abort();
      artifactUploadController = undefined;
      durablePolling = true;
    }
    if (changed || observedOpen !== open) untrack(reset);
    observedScope = scope;
    observedOpen = open;
    observedDryRun = dryRun;
  });
  $effect(() => {
    const task = taskQuery.data;
    if (dryRun || !open || !allowed || !durableTaskId || !task || durableHandledTaskId === durableTaskId) return;
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
      {#if !allowed}
        <p role="status">{i18n.t('common.operationFailed', { defaultValue: 'Import is unavailable.' })}</p>
      {/if}
      {#if currentStep === 3 && previewResult}
        <div class="space-y-5 py-2">
          <div class="flex items-center gap-2">
            <FileSpreadsheet class="h-5 w-5" />
            <span>{i18n.t('import.preview')}</span>
          </div>
          <p role="status">
            {i18n.t('import.previewSummary', {
              total: previewResult.totalRows,
              importable: previewResult.importableRows,
              failed: previewResult.failedRows.length,
            })}
          </p>
          <p>{i18n.t('import.previewHint')}</p>
          {#if previewResult.failedRows.length > 0}
            <div class="flex items-center gap-2 text-destructive">
              <AlertCircle class="h-4 w-4" />
              <span>{i18n.t('import.previewFailed')}</span>
            </div>
            <ul>
              {#each previewResult.failedRows.slice(0, 20) as failure (failure.row)}
                <li>{i18n.t('import.previewFailedRow', { row: failure.row, error: failure.error })}</li>
              {/each}
            </ul>
          {/if}
          <div class="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onclick={() => { previewResult = null; currentStep = 2; }}>
              {i18n.t('import.backToImport')}
            </Button>
            <Button variant="outline" size="sm" onclick={reset}>
              {i18n.t('common.importAnother', { defaultValue: 'Import Another' })}
            </Button>
          </div>
        </div>
      {:else if durableMode && (durableTaskId || durableSubmitAttempt || currentStep === 3)}
        {#if durableTaskId}
          <p>{durableTaskId}</p>
          {#if taskQuery.isError}
            <p role="alert">{i18n.t('task.fetchFailed')}</p>
            <Button type="button" onclick={() => taskQuery.refetch()}>{i18n.t('common.retry')}</Button>
          {:else if taskQuery.data && allowed}
            <TaskStatusBadge status={taskQuery.data.status ?? 'pending'} />
            {@const progress = resolveTaskProgress(taskQuery.data)}
            {#if progress !== undefined}
              <Progress value={progress} />
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
              disabled={!allowed}
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
          {#if fileError}
            <p role="alert">{fileError}</p>
          {/if}
        </div>
      {/if}

      <!-- Step 2: Column Mapping -->
      {#if currentStep === 2 && !durableTaskId}
        <div class="space-y-4">
          {#if fileError}<p role="alert">{fileError}</p>{/if}
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
                    aria-label={`Map ${header}`}
                    class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

          <div class="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onclick={() => { currentStep = 1; }}>
              <ArrowLeft class="h-3.5 w-3.5 mr-1" />
              {i18n.t('common.back', { defaultValue: 'Back' })}
            </Button>
            {#if dryRun}
              <Button size="sm" disabled={!allowed || isImporting} onclick={previewImport}>
                {i18n.t('import.preview')}
                <ArrowRight class="h-3.5 w-3.5 ml-1" />
              </Button>
            {:else if onPreview}
              <Button variant="outline" size="sm" disabled={!allowed || isImporting} onclick={previewImport}>
                {i18n.t('common.preview')}
                <ArrowRight class="h-3.5 w-3.5 ml-1" />
              </Button>
            {/if}
            {#if !dryRun}
              <Button size="sm" disabled={!allowed || isImporting} onclick={startImport}>
                {i18n.t('common.startImport', { defaultValue: 'Start Import' })}
                <ArrowRight class="h-3.5 w-3.5 ml-1" />
              </Button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Step 3: Progress & Summary -->
      {#if currentStep === 3 && !durableMode && !previewResult}
        <div class="space-y-5 py-2">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{cancelled ? i18n.t('import.stopped') : isImporting ? i18n.t('common.importing', { defaultValue: 'Importing...' }) : importError ? i18n.t('common.operationFailed', { defaultValue: 'Import failed' }) : i18n.t('common.completed', { defaultValue: 'Completed' })}</span>
              {#if !cancelled}<span class="font-semibold text-foreground tabular-nums">{progressPercent}%</span>{/if}
            </div>
            {#if !cancelled}<Progress value={progressPercent} class="h-2" />{/if}
          </div>

          {#if cancelled}
            <p role="status">{i18n.t('import.stoppedHint')}</p>
          {:else}
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
          {/if}

          {#if importError}
            <p role="alert">{importError}</p>
          {/if}

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
              <Button variant="outline" size="sm" onclick={cancelImport}>{i18n.t('common.cancel')}</Button>
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
