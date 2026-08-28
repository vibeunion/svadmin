import { captureAdminContext } from './context.svelte';
import { useParsed } from './useParsed.svelte';
import type { Sort, Filter, BaseRecord } from './types';
import { downloadData } from './export-format';
import type { ExportFormat } from './export-format';
import { parseCSV } from './helpers-pure';
export { parseCSV } from './helpers-pure';
export { downloadData, toCsv, toJson, toXlsx, escapeCsvField } from './export-format';
export type { ExportFormat } from './export-format';

export interface UseExportOptions<TData extends BaseRecord = BaseRecord> {
  resource?: string;
  mapData?: (item: TData) => Record<string, unknown>;
  sorters?: Sort[];
  filters?: Filter[];
  maxItemCount?: number;
  pageSize?: number;
  download?: boolean;
  /** 导出格式，默认 csv（兼容旧版） */
  format?: ExportFormat;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  onError?: (error: Error) => void;
}

/**
 * useExport — export records from a resource as CSV/JSON/XLSX download
 * Supports mapData, sorters, filters, maxItemCount, pageSize
 */
export function useExport<TData extends BaseRecord = BaseRecord>(options: UseExportOptions<TData> = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const resource = $derived(options.resource ?? parsed.resource ?? '');
  let isLoading = $state(false);

  async function triggerExport() {
    const exportResource = resource;
    isLoading = true;

    try {
      const provider = adminContext.getDataProviderForResource(exportResource, options.dataProviderName);
      const batchSize = options.pageSize ?? 20;
      const maxItems = options.maxItemCount ?? Infinity;
      let allRecords: TData[] = [];
      let page = 1;

      while (allRecords.length < maxItems) {
        const result = await provider.getList<TData>({
          resource: exportResource,
          pagination: { current: page, pageSize: batchSize },
          sorters: options.sorters,
          filters: options.filters,
          meta: options.meta,
        });

        allRecords = [...allRecords, ...result.data];
        if (result.data.length < batchSize || allRecords.length >= result.total) break;
        page++;
      }

      if (maxItems !== Infinity) allRecords = allRecords.slice(0, maxItems);
      if (allRecords.length === 0) return allRecords;

      const mapped = options.mapData
        ? allRecords.map(options.mapData)
        : allRecords.map(r => r as unknown as Record<string, unknown>);

      if (options.download !== false && typeof document !== 'undefined') {
        downloadData(mapped, exportResource, options.format ?? 'csv');
      }

      return allRecords;
    } catch (error) {
      const exportError = error instanceof Error ? error : new Error(String(error));
      if (!options.onError) throw exportError;
      options.onError(exportError);
      return [];
    } finally {
      isLoading = false;
    }
  }

  return {
    triggerExport,
    get isLoading() { return isLoading; },
  };
}

export interface UseImportOptions<TData = Record<string, unknown>> {
  resource?: string;
  /** 指定导入文件格式；默认 auto = 根据文件扩展名推断。注意：import 仅支持 csv 和 json，不支持 xlsx 解析 */
  format?: 'auto' | 'csv' | 'json';
  mapData?: (item: Record<string, unknown>) => TData;
  batchSize?: number;
  onFinish?: (result: { succeeded: unknown[]; errored: { request: unknown; error: unknown }[] }) => void;
  onProgress?: (info: { totalAmount: number; processedAmount: number }) => void;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
}

/**
 * useImport — import records from a CSV file
 * Supports mapData, batchSize, onFinish, onProgress, meta
 */
export function useImport<TData = Record<string, unknown>>(options: UseImportOptions<TData> = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const resource = $derived(options.resource ?? parsed.resource ?? '');
  let isLoading = $state(false);
  let mutationResult = $state<{ succeeded: unknown[]; errored: { request: unknown; error: unknown }[] } | null>(null);

  async function handleChange(info: { file: File }) {
    const importResource = resource;
    isLoading = true;
    const succeeded: unknown[] = [];
    const errored: { request: unknown; error: unknown }[] = [];

    try {
      const provider = adminContext.getDataProviderForResource(importResource, options.dataProviderName);
      let text = await info.file.text();
      // Strip BOM
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      // 自动检测或使用指定格式
      const format = options.format ?? 'auto';
      const isJson = format === 'json' || (format === 'auto' && info.file.name.toLowerCase().endsWith('.json'));

      let records: Record<string, unknown>[];

      if (isJson) {
        // JSON 格式：期望数组对象
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          mutationResult = { succeeded: [], errored: [{ request: null, error: new Error('JSON import requires an array of objects') }] };
          options.onFinish?.(mutationResult);
          return;
        }
        records = parsed.map((item: unknown) =>
          options.mapData ? (options.mapData(item as Record<string, unknown>) as unknown as Record<string, unknown>) : (item as Record<string, unknown>)
        );
      } else {
        // CSV 格式
        const rows = parseCSV(text);
        if (rows.length < 2) {
          mutationResult = { succeeded: [], errored: [] };
          options.onFinish?.({ succeeded: [], errored: [] });
          return;
        }

        const headers = rows[0];
        records = [];
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i];
          const record: Record<string, unknown> = {};
          headers.forEach((h, idx) => { record[h] = values[idx] ?? ''; });
          records.push(options.mapData ? (options.mapData(record) as unknown as Record<string, unknown>) : record);
        }
      }

      const batchSize = options.batchSize ?? 1;
      let processed = 0;

      if (batchSize === 1) {
        for (const record of records) {
          try {
            const res = await provider.create({ resource: importResource, variables: record, meta: options.meta });
            succeeded.push(res);
          } catch (error) {
            errored.push({ request: record, error });
          }
          processed++;
          options.onProgress?.({ totalAmount: records.length, processedAmount: processed });
        }
      } else {
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          if (provider.createMany) {
            try {
              const res = await provider.createMany({ resource: importResource, variables: batch, meta: options.meta });
              succeeded.push(res);
            } catch (error) {
              errored.push({ request: batch, error });
            }
          } else {
            for (const record of batch) {
              try {
                const res = await provider.create({ resource: importResource, variables: record, meta: options.meta });
                succeeded.push(res);
              } catch (error) {
                errored.push({ request: record, error });
              }
            }
          }
          processed += batch.length;
          options.onProgress?.({ totalAmount: records.length, processedAmount: processed });
        }
      }

      mutationResult = { succeeded, errored };
      options.onFinish?.({ succeeded, errored });
    } catch (error) {
      mutationResult = { succeeded, errored: [...errored, { request: null, error }] };
      options.onFinish?.({ succeeded, errored: mutationResult.errored });
    } finally {
      isLoading = false;
    }
  }

  return {
    inputProps: { type: 'file' as const, accept: '.csv,.json' },
    handleChange,
    get isLoading() { return isLoading; },
    get mutationResult() { return mutationResult; },
  };
}
