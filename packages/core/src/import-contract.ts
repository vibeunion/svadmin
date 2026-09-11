import Papa from 'papaparse';
import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { HttpError } from './types';
import { parseContractId, parseContractRecord, type ContractSchemas, type ResourceContract } from './resource-contract';
import { decodeOneResult, decodeManyResult, rejectProviderResponse } from './record-decoder';

export type ImportFormat = 'auto' | 'csv' | 'json';
const progressSchema = Type.Object({
  totalAmount: Type.Integer({ minimum: 0 }),
  attemptedAmount: Type.Integer({ minimum: 0 }),
  processedAmount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type ImportOperationProgress = Static<typeof progressSchema>;

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

export function invalidImportInput(row?: number): never {
  throw new HttpError('Invalid import input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT',
    details: { phase: 'input', writeMayHaveSucceeded: false, ...(row === undefined ? {} : { row }) },
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
    const read = Blob.prototype.text.bind(file);
    return { file, name, read };
  } catch {
    return invalidImportInput();
  }
}

const rowsSchema = Type.Array(Type.Record(Type.String(), Type.Unknown()));
const csvSchema = Type.Array(Type.Array(Type.String()));

/** CSV values stay strings; only an explicit mapper may supply business conversions. */
export function parseImportRows(text: string, name: string, format: ImportFormat): Record<string, unknown>[] {
  try {
    const source = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    const selected = format === 'auto' ? name.toLowerCase().endsWith('.json') ? 'json'
      : name.toLowerCase().endsWith('.csv') ? 'csv' : undefined : format;
    if (selected === 'json') {
      const data = snapshotPlainData(JSON.parse(source));
      return checkExact(rowsSchema, data) ? data : invalidImportInput();
    }
    if (selected !== 'csv') return invalidImportInput();
    const parsed = Papa.parse<unknown>(source, { delimiter: ',', dynamicTyping: false, skipEmptyLines: true });
    const data = snapshotPlainData(parsed.data);
    if (parsed.errors.length || !checkExact(csvSchema, data)) return invalidImportInput();
    const [headers, ...rows] = data;
    if (!headers) return [];
    if (headers.some(header => header.trim() === '') || new Set(headers).size !== headers.length) return invalidImportInput();
    return rows.map((row, index) => {
      if (row.length !== headers.length) return invalidImportInput(index + 1);
      return Object.fromEntries(headers.map((header, column) => [header, row[column]]));
    });
  } catch {
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
