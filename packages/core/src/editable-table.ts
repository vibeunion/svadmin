import type { DataProvider, Filter, Pagination, Sort } from './types';
import { HttpError } from './types';
import { definedOptions } from './defined-options';
import {
  getContractFormFields,
  parseContractCreateInput,
  parseContractRecord,
  parseContractUpdateInput,
  type ResourceContract,
} from './resource-contract';

export interface EditableTableQuery {
  pagination?: Pagination;
  sorters?: Sort[];
  filters?: Filter[];
  meta?: Record<string, unknown>;
  /** false 只请求一次；数字表示失败后的额外重试次数，与 TanStack Query 的 retry 一致。 */
  retry?: boolean | number;
}

export function resolveEditableTableQuery(
  options: {
    pagination?: Pagination;
    sorters?: Sort[];
    filters?: Filter[];
    syncWithLocation?: boolean;
  },
  url?: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Filter[];
  },
): Pick<EditableTableQuery, 'pagination' | 'sorters' | 'filters'> {
  const synced = options.syncWithLocation === true;
  return {
    pagination: {
      ...options.pagination,
      current: synced ? url?.page ?? options.pagination?.current ?? 1 : options.pagination?.current ?? 1,
      pageSize: synced ? url?.pageSize ?? options.pagination?.pageSize ?? 50 : options.pagination?.pageSize ?? 50,
    },
    ...(synced && url?.sortField
      ? { sorters: [{ field: url.sortField, order: url.sortOrder ?? 'asc' }] }
      : options.sorters ? { sorters: options.sorters } : {}),
    ...((synced ? url?.filters ?? options.filters : options.filters) ? {
      filters: synced ? url?.filters ?? options.filters : options.filters,
    } : {}),
  };
}

function retryAttempts(retry: boolean | number | undefined): number {
  if (retry === true) return 4;
  if (typeof retry === 'number' && Number.isInteger(retry) && retry > 0 && retry <= 10) return retry + 1;
  return 1;
}

export interface EditableTableSnapshot {
  rows: Record<string, unknown>[];
  errors: Record<string, string>;
  saving: boolean;
  failure: string | null;
}

interface EditableRow {
  key: string;
  id?: string | number;
  draft: boolean;
  values: Record<string, unknown>;
  original: Record<string, unknown>;
  error: string | null;
  failed: boolean;
  dirty: boolean;
}

let nextKey = 0;

function pick(fields: readonly string[], values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.hasOwn(values, field)) result[field] = values[field];
  }
  return result;
}

/**
 * Headless editable-table contract: form values, schema validation,
 * per-row submit, failure recovery, and batch update.
 */
export function createEditableTableController(
  contract: ResourceContract,
  provider: DataProvider,
  query: EditableTableQuery = {},
) {
  let rows: EditableRow[] = [];
  let saving = false;
  let failure: string | null = null;

  function snapshot(): EditableTableSnapshot {
    const errors: Record<string, string> = {};
    for (const row of rows) {
      if (row.error) errors[row.key] = row.error;
    }
    return {
      rows: rows.map((row) => ({ ...row.values, id: row.id ?? row.key })),
      errors,
      saving,
      failure,
    };
  }

  async function readRows(): Promise<void> {
    const result = await provider.getList({
      resource: contract.name,
      ...definedOptions({
        pagination: query.pagination ?? { current: 1, pageSize: 50 },
        sorters: query.sorters,
        filters: query.filters,
        meta: query.meta,
      }),
    });
    const records = result.data.map((record) => parseContractRecord(contract, record));
    rows = records.map((record) => {
      const rawId = record['id'];
      const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : undefined;
      const values = { ...record };
      return {
        key: id === undefined ? `row_${++nextKey}` : String(id),
        ...(id === undefined ? {} : { id }),
        draft: false,
        values,
        original: { ...values },
        error: null,
        failed: false,
        dirty: false,
      };
    });
    failure = null;
  }

  async function load(): Promise<void> {
    const attempts = retryAttempts(query.retry);
    let last: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await readRows();
        return;
      } catch (error) {
        last = error;
        if (error instanceof HttpError && error.code === 'INVALID_PROVIDER_RESPONSE') break;
      }
    }
    failure = 'Could not load rows';
    throw last;
  }

  function setCell(rowIndex: number, key: string, value: unknown): void {
    const row = rows[rowIndex];
    if (!row || key === 'id') return;
    row.values = { ...row.values, [key]: value };
    row.dirty = true;
    row.error = null;
    row.failed = false;
    failure = null;
  }

  function addRow(): void {
    const key = `row_${++nextKey}`;
    const values: Record<string, unknown> = {};
    for (const field of getContractFormFields(contract, 'create')) values[field] = '';
    rows = [...rows, {
      key,
      draft: true,
      values,
      original: { ...values },
      error: null,
      failed: false,
      dirty: true,
    }];
  }

  function deleteRow(rowIndex: number): void {
    const row = rows[rowIndex];
    if (!row) return;
    rows = rows.filter((candidate) => candidate !== row);
  }

  function validateRow(row: EditableRow): boolean {
    try {
      if (row.draft) {
        parseContractCreateInput(contract, pick(getContractFormFields(contract, 'create'), row.values));
      } else {
        parseContractUpdateInput(contract, pick(getContractFormFields(contract, 'edit'), row.values));
      }
      row.error = null;
      return true;
    } catch {
      row.error = row.draft ? 'Invalid create input' : 'Invalid update input';
      return false;
    }
  }

  async function persist(row: EditableRow): Promise<void> {
    if (row.draft) {
      const variables = parseContractCreateInput(contract, pick(getContractFormFields(contract, 'create'), row.values));
      const result = await provider.create({ resource: contract.name, variables });
      const created = parseContractRecord(contract, result.data);
      const id = typeof created['id'] === 'string' || typeof created['id'] === 'number' ? created['id'] : undefined;
      row.draft = false;
      row.dirty = false;
      row.failed = false;
      row.error = null;
      if (id !== undefined) {
        row.id = id;
        row.key = String(id);
      }
      row.values = { ...row.values, ...created };
      row.original = { ...row.values };
      return;
    }
    if (row.id === undefined) return;
    const variables = parseContractUpdateInput(contract, pick(getContractFormFields(contract, 'edit'), row.values));
    const result = await provider.update({ resource: contract.name, id: row.id, variables });
    const saved = parseContractRecord(contract, result.data);
    row.dirty = false;
    row.failed = false;
    row.error = null;
    row.values = { ...row.values, ...saved };
    row.original = { ...row.values };
  }

  async function exclusive(work: () => Promise<void>): Promise<void> {
    if (saving) return;
    saving = true;
    try {
      await work();
    } finally {
      saving = false;
    }
  }

  async function submitTargets(targets: readonly EditableRow[]): Promise<void> {
    failure = null;
    let failed = 0;
    for (const row of targets) {
      if (!validateRow(row)) {
        row.failed = true;
        failed += 1;
        continue;
      }
      try {
        await persist(row);
      } catch {
        row.failed = true;
        row.error = 'Save failed';
        failed += 1;
      }
    }
    failure = failed > 0 ? `${failed} row(s) were not saved` : null;
  }

  async function submit(): Promise<void> {
    await exclusive(() => submitTargets(rows.filter((row) => row.draft || row.dirty || row.failed)));
  }

  async function retry(): Promise<void> {
    await exclusive(() => submitTargets(rows.filter((row) => row.failed)));
  }

  async function submitBatch(patch: Record<string, unknown>): Promise<void> {
    let variables: unknown;
    try {
      variables = parseContractUpdateInput(contract, patch);
    } catch {
      failure = 'Invalid update input';
      return;
    }
    const targets = rows.filter((row) => !row.draft && row.id !== undefined);
    const ids = targets.flatMap((row) => row.id === undefined ? [] : [row.id]);
    await exclusive(async () => {
      failure = null;
      try {
        if (provider.updateMany) {
          const result = await provider.updateMany({ resource: contract.name, ids, variables });
          for (const record of result.data) parseContractRecord(contract, record);
        } else {
          for (const id of ids) {
            const result = await provider.update({ resource: contract.name, id, variables });
            parseContractRecord(contract, result.data);
          }
        }
        for (const row of targets) {
          row.values = { ...row.values, ...patch };
          row.original = { ...row.values };
          row.dirty = false;
          row.failed = false;
          row.error = null;
        }
      } catch {
        for (const row of targets) {
          row.failed = true;
          row.error = 'Save failed';
          row.values = { ...row.values, ...patch };
          row.dirty = true;
        }
        failure = `${targets.length} row(s) were not saved`;
      }
    });
  }

  return { snapshot, load, setCell, addRow, deleteRow, submit, retry, submitBatch };
}

export type EditableTableController = ReturnType<typeof createEditableTableController>;
