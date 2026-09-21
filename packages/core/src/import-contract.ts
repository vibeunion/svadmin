import Papa from 'papaparse';
import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { HttpError } from './types';
import { parseContractId, parseContractRecord, type ContractSchemas, type ResourceContract } from './resource-contract';
import { decodeOneResult, decodeManyResult, rejectProviderResponse } from './record-decoder';

export type ImportFormat = 'auto' | 'csv' | 'json';
export const IMPORT_LIMITS = Object.freeze({ maxRows: 10_000, maxBytes: 50 * 1024 * 1024 });
export interface ImportArtifact {
  artifactId: string;
  fileName: string;
  size: number;
  contentType?: string;
}
export interface ImportArtifactProvider {
  upload: (input: {
    file: File; fileName: string; size: number; resource: string;
    idempotencyKey: string; signal: AbortSignal;
  }) => Promise<unknown>;
}
const progressSchema = Type.Object({
  totalAmount: Type.Integer({ minimum: 0 }),
  attemptedAmount: Type.Integer({ minimum: 0 }),
  processedAmount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type ImportOperationProgress = Static<typeof progressSchema>;
const importTaskResultSchema = Type.Object({
  succeeded: Type.Integer({ minimum: 0, maximum: IMPORT_LIMITS.maxRows }),
  failed: Type.Integer({ minimum: 0, maximum: IMPORT_LIMITS.maxRows }),
  failedRows: Type.Optional(Type.Array(Type.Object({
    row: Type.Integer({ minimum: 1, maximum: IMPORT_LIMITS.maxRows }),
    error: Type.String({ maxLength: 2000 }),
  }, { additionalProperties: false }), { maxItems: IMPORT_LIMITS.maxRows })),
  retry: Type.Optional(Type.Object({
    receiptId: Type.String({ minLength: 1, maxLength: 200 }),
    rows: Type.Array(Type.Integer({ minimum: 1, maximum: IMPORT_LIMITS.maxRows }), {
      minItems: 1, maxItems: IMPORT_LIMITS.maxRows, uniqueItems: true,
    }),
  }, { additionalProperties: false })),
}, { additionalProperties: false });
export type ImportTaskResult = Static<typeof importTaskResultSchema>;

export function snapshotImportArtifact(value: unknown): ImportArtifact | undefined {
  try {
    const candidate = snapshotPlainData(value);
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return;
    const artifactId = candidate['artifactId'];
    const fileName = candidate['fileName'];
    const size = candidate['size'];
    const contentType = candidate['contentType'];
    if (typeof artifactId !== 'string' || !artifactId.trim() || artifactId.length > 200
      || typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255
      || typeof size !== 'number') return;
    if (!Number.isSafeInteger(size) || size < 0 || size > IMPORT_LIMITS.maxBytes
      || Object.keys(candidate).some(key => !['artifactId', 'fileName', 'size', 'contentType'].includes(key))
      || (contentType !== undefined && (typeof contentType !== 'string' || contentType.length > 200))) return;
    return {
      artifactId,
      fileName,
      size,
      ...(contentType === undefined ? {} : { contentType }),
    };
  } catch {
    return;
  }
}

export function newImportProgress(): ImportOperationProgress {
  return { totalAmount: 0, attemptedAmount: 0, processedAmount: 0 };
}

export function snapshotImportProgress(value: unknown): ImportOperationProgress {
  const progress = snapshotPlainData(value);
  if (!checkExact(progressSchema, progress) || progress.processedAmount > progress.attemptedAmount ||
    progress.attemptedAmount > progress.totalAmount ||
    !Object.values(progress).every(Number.isSafeInteger)) throw new HttpError('Invalid import progress', 500);
  return progress;
}

export function snapshotImportTaskResult(value: unknown): ImportTaskResult | undefined {
  try {
    const snapshot = snapshotPlainData(value);
    if (!checkExact(importTaskResultSchema, snapshot) ||
        snapshot.succeeded + snapshot.failed > IMPORT_LIMITS.maxRows ||
        (snapshot.failedRows?.length ?? 0) > snapshot.failed ||
        new Set(snapshot.failedRows?.map(row => row.row)).size !== (snapshot.failedRows?.length ?? 0)) return undefined;
    const failedRowIds = new Set(snapshot.failedRows?.map(row => row.row));
    if (snapshot.retry && (!snapshot.retry.receiptId.trim() ||
      snapshot.retry.rows.some(row => !failedRowIds.has(row)))) return undefined;
    return snapshot;
  } catch {
    return undefined;
  }
}

export function invalidImportInput(row?: number): never {
  throw new HttpError('Invalid import input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT',
    details: { phase: 'input', writeMayHaveSucceeded: false, ...(row === undefined ? {} : { row }) },
  });
}

export function importLimitExceeded(): never {
  throw new HttpError('Import exceeds the configured limit', 413, undefined, {
    code: 'IMPORT_LIMIT_EXCEEDED', details: { phase: 'input', writeMayHaveSucceeded: false },
  });
}

/** Files are the only non-JSON input; do not invoke caller-supplied getters or text methods. */
export function snapshotImportFile(value: unknown) {
  try {
    if (typeof value !== 'object' || value === null ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
        Reflect.ownKeys(value).length !== 1) return invalidImportInput();
    const property = Object.getOwnPropertyDescriptor(value, 'file');
    const file: unknown = property && 'value' in property ? property.value : undefined;
    if (!(file instanceof File)) return invalidImportInput();
    const ownName = Object.getOwnPropertyDescriptor(file, 'name');
    if (ownName && !('value' in ownName)) return invalidImportInput();
    const name: unknown = ownName ? ownName.value : Object.getOwnPropertyDescriptor(File.prototype, 'name')?.get?.call(file);
    if (typeof name !== 'string') return invalidImportInput();
    const size: unknown = Object.getOwnPropertyDescriptor(Blob.prototype, 'size')?.get?.call(file);
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0) return invalidImportInput();
    const read = Blob.prototype.text.bind(file);
    return { file, name, size, read };
  } catch {
    return invalidImportInput();
  }
}

const rowsSchema = Type.Array(Type.Record(Type.String(), Type.Unknown()));
const csvSchema = Type.Array(Type.Array(Type.String()));

/** CSV values stay strings; only an explicit mapper may supply business conversions. */
export function parseImportRows(text: string, name: string, format: ImportFormat, maxRows: number = IMPORT_LIMITS.maxRows): Record<string, unknown>[] {
  try {
    if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > IMPORT_LIMITS.maxRows) return invalidImportInput();
    if (text.length > IMPORT_LIMITS.maxBytes) return importLimitExceeded();
    const source = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    const selected = format === 'auto' ? name.toLowerCase().endsWith('.json') ? 'json'
      : name.toLowerCase().endsWith('.csv') ? 'csv' : undefined : format;
    if (selected === 'json') {
      const parsed: unknown = JSON.parse(source);
      if (Array.isArray(parsed) && parsed.length > maxRows) return importLimitExceeded();
      const data = snapshotPlainData(parsed);
      if (!checkExact(rowsSchema, data)) return invalidImportInput();
      if (data.length > maxRows) return importLimitExceeded();
      return data;
    }
    if (selected !== 'csv') return invalidImportInput();
    const parsed = Papa.parse<unknown>(source, {
      delimiter: ',', dynamicTyping: false, skipEmptyLines: true, preview: maxRows + 2,
    });
    if (parsed.data.length > maxRows + 1) return importLimitExceeded();
    const data = snapshotPlainData(parsed.data);
    if (parsed.errors.length || !checkExact(csvSchema, data)) return invalidImportInput();
    const [headers, ...rows] = data;
    if (!headers) return [];
    if (headers.some(header => header.trim() === '') || new Set(headers).size !== headers.length) return invalidImportInput();
    if (rows.length > maxRows) return importLimitExceeded();
    return rows.map((row, index) => {
      if (row.length !== headers.length) return invalidImportInput(index + 1);
      return Object.fromEntries(headers.map((header, column) => [header, row[column]]));
    });
  } catch (cause) {
    if (cause instanceof HttpError && cause.code === 'IMPORT_LIMIT_EXCEEDED') throw cause;
    return invalidImportInput();
  }
}

export function decodeImportReceipt<S extends ContractSchemas>(
  contract: ResourceContract<S>, response: unknown, inputs: readonly unknown[],
  batch: boolean, seen: ReadonlySet<string | number>,
) {
  try {
    const receipt = snapshotPlainData(response);
    const rows = batch
      ? decodeManyResult(receipt, value => parseContractRecord(contract, value), true).data
      : [decodeOneResult(receipt, value => parseContractRecord(contract, value), true).data];
    if (rows.length !== inputs.length || new Set(rows.map(row => row.id)).size !== rows.length) rejectProviderResponse(true);
    for (const [index, row] of rows.entries()) {
      const recordId = parseContractId(contract, row.id);
      const submitted = inputs[index];
      const id: unknown = typeof submitted === 'object' && submitted !== null
        ? Object.getOwnPropertyDescriptor(submitted, 'id')?.value : undefined;
      if ((id !== undefined && id !== recordId) || seen.has(recordId)) rejectProviderResponse(true);
    }
    return rows;
  } catch {
    return rejectProviderResponse(true);
  }
}
