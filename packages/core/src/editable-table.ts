import type { DataProvider } from './types';
import {
  getContractFormFields,
  parseContractCreateInput,
  parseContractUpdateInput,
  type ResourceContract,
} from './resource-contract';

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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Headless editable-table contract: form values, schema validation,
 * per-row submit, failure recovery, and batch update.
 */
export function createEditableTableController(contract: ResourceContract, provider: DataProvider) {
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

  async function load(): Promise<void> {
    const result = await provider.getList({
      resource: contract.name,
      pagination: { current: 1, pageSize: 50 },
    });
    rows = result.data.map((record) => {
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
      const created = asRecord(result.data);
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
    row.dirty = false;
    row.failed = false;
    row.error = null;
    row.values = { ...row.values, ...asRecord(result.data) };
    row.original = { ...row.values };
  }

  async function submitTargets(targets: readonly EditableRow[]): Promise<void> {
    saving = true;
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
    saving = false;
    failure = failed > 0 ? `${failed} row(s) were not saved` : null;
  }

  async function submit(): Promise<void> {
    await submitTargets(rows.filter((row) => row.draft || row.dirty || row.failed));
  }

  async function retry(): Promise<void> {
    await submitTargets(rows.filter((row) => row.failed));
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
    saving = true;
    failure = null;
    try {
      if (provider.updateMany) {
        await provider.updateMany({ resource: contract.name, ids, variables });
      } else {
        for (const id of ids) await provider.update({ resource: contract.name, id, variables });
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
    } finally {
      saving = false;
    }
  }

  return { snapshot, load, setCell, addRow, deleteRow, submit, retry, submitBatch };
}

export type EditableTableController = ReturnType<typeof createEditableTableController>;
