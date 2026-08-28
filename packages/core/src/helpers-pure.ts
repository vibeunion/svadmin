// Pure utility functions — no Svelte runtime dependency
// Extracted to enable unit testing with bun test

import type { Filter, Sort, CrudOperator } from './types';

// ─── Table Helpers ────────────────────────────────────────────

/**
 * Get the current filter value for a field from a filter array.
 */
export function getDefaultFilter(
  columnName: string,
  filters?: Filter[],
  operatorType: CrudOperator = 'eq',
): unknown | undefined {
  if (!filters) return undefined;
  const filter = filters.find((f) => {
    if ('field' in f) {
      return f.field === columnName && f.operator === operatorType;
    }
    return false;
  });
  return filter && 'value' in filter ? filter.value : undefined;
}

/**
 * Get the current sort order for a field from a sorter array.
 */
export function getDefaultSortOrder(
  columnName: string,
  sorters?: Sort[],
): 'asc' | 'desc' | undefined {
  if (!sorters) return undefined;
  const sortItem = sorters.find((item) => item.field === columnName);
  return sortItem?.order as 'asc' | 'desc' | undefined;
}

/**
 * Merge two filter arrays, deduplicating by field+operator.
 */
export function unionFilters(
  permanentFilter: Filter[],
  newFilters: Filter[],
  prevFilters: Filter[] = [],
): Filter[] {
  const compareFilters = (a: Filter, b: Filter): boolean => {
    if ('field' in a && 'field' in b) {
      return a.field === b.field && a.operator === b.operator;
    }
    return false;
  };

  const result = [...prevFilters];

  for (const newFilter of newFilters) {
    const idx = result.findIndex((f) => compareFilters(f, newFilter));
    if (idx >= 0) {
      result[idx] = newFilter;
    } else {
      result.push(newFilter);
    }
  }

  for (const perm of permanentFilter) {
    const idx = result.findIndex((f) => compareFilters(f, perm));
    if (idx >= 0) {
      result[idx] = perm;
    } else {
      result.push(perm);
    }
  }

  return result.filter((f) => !('value' in f && f.value === undefined));
}

/**
 * Merge two sorter arrays, deduplicating by field.
 */
export function unionSorters(
  permanentSorters: Sort[],
  newSorters: Sort[],
): Sort[] {
  const result = [...newSorters];

  for (const perm of permanentSorters) {
    const idx = result.findIndex((s) => s.field === perm.field);
    if (idx >= 0) {
      result[idx] = perm;
    } else {
      result.push(perm);
    }
  }

  return result;
}

/**
 * Convert a File to a base64 data URL string.
 */
export function file2Base64(file: File | { uid?: string } & Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file as Blob);
    reader.addEventListener('load', () => {
      resolve(reader.result as string);
    });
    reader.addEventListener('error', () => {
      reject(reader.error);
    });
  });
}

/** Parse full CSV text respecting quoted multi-line fields */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  let wasQuoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        wasQuoted = true;
      } else if (ch === ',') {
        currentRow.push(wasQuoted ? currentVal : currentVal.trim());
        currentVal = '';
        wasQuoted = false;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(wasQuoted ? currentVal : currentVal.trim());
        if (currentRow.some(v => v !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
        wasQuoted = false;
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
      } else {
        currentVal += ch;
      }
    }
  }
  
  if (currentVal || currentRow.length > 0) {
    currentRow.push(wasQuoted ? currentVal : currentVal.trim());
    if (currentRow.some(v => v !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
}

// ─── Universal Schema Validator Helper ──────────────────────────

/**
 * Universal schema interface compatible with TypeBox, Standard Schema (v1), Valibot, Zod,
 * Yup, Joi, etc.
 */
export interface SchemaValidatorLike {
  Check?: (value: unknown) => boolean;
  Errors?: (value: unknown) => Iterable<{ path?: string; message: string; schema?: unknown }>;
  safeParse?: (data: unknown) => {
    success: boolean;
    data?: unknown;
    error?: {
      issues?: Array<{ path?: Array<string | number>; message: string }>;
      errors?: Array<{ path?: Array<string | number>; message: string }>;
    };
  };
  parse?: (data: unknown) => unknown;
  validate?: (data: unknown) => {
    error?: {
      details?: Array<{ path?: Array<string | number>; message: string }>;
      message?: string;
    };
  };
  '~standard'?: {
    validate: (data: unknown) => unknown | Promise<unknown>;
  };
}

/**
 * TypeBox validator interface matching TypeCompiler.Compile or Value.Errors
 */
export type TypeBoxValidatorLike = {
  Check?: (value: unknown) => boolean;
  Errors: (value: unknown) => Iterable<{ path?: string; message: string }>;
};

/**
 * Creates a synchronous form validator function from any TypeBox, Standard Schema v1,
 * Valibot, Zod, Yup, or Joi object.
 *
 * @example
 * ```ts
 * import { Type } from '@sinclair/typebox';
 * import { TypeCompiler } from '@sinclair/typebox/compiler';
 * import { createSchemaValidator, useForm } from '@svadmin/core';
 *
 * const userSchema = Type.Object({
 *   name: Type.String({ minLength: 2 }),
 *   email: Type.String({ format: 'email' }),
 * });
 *
 * const form = useForm({
 *   resource: 'users',
 *   validate: createSchemaValidator(TypeCompiler.Compile(userSchema)),
 * });
 * ```
 */
export function createSchemaValidator(
  schema: SchemaValidatorLike | unknown
): (values: Record<string, unknown>) => Record<string, string> | null {
  if (!schema || typeof schema !== 'object') {
    return () => null;
  }

  const s = schema as SchemaValidatorLike;

  return (values: Record<string, unknown>) => {
    const errors: Record<string, string> = {};

    // 0. TypeBox TypeCompiler compiled validator (.Check & .Errors)
    if (typeof s.Check === 'function' && typeof s.Errors === 'function') {
      if (s.Check(values)) return null;
      for (const err of s.Errors(values)) {
        const rawPath = err.path || '';
        const cleanPath = rawPath.replace(/^\//, '').replace(/\//g, '.');
        const key = cleanPath || '_root';
        if (!errors[key]) errors[key] = err.message;
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }

    // 0b. TypeBox Value.Errors iterator provider
    if (typeof s.Errors === 'function') {
      for (const err of s.Errors(values)) {
        const rawPath = err.path || '';
        const cleanPath = rawPath.replace(/^\//, '').replace(/\//g, '.');
        const key = cleanPath || '_root';
        if (!errors[key]) errors[key] = err.message;
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }

    // 1. Standard Schema v1 (~standard)
    if (s['~standard'] && typeof s['~standard'].validate === 'function') {
      const res = s['~standard'].validate(values);
      if (res && typeof res === 'object' && 'issues' in res && Array.isArray((res as { issues?: Array<{ path?: Array<unknown>; message: string }> }).issues)) {
        for (const issue of (res as { issues: Array<{ path?: Array<unknown>; message: string }> }).issues) {
          const rawPath = issue.path?.[0];
          const key = typeof rawPath === 'object' && rawPath !== null && 'key' in rawPath
            ? String((rawPath as { key: unknown }).key)
            : rawPath != null
              ? String(rawPath)
              : '_root';
          if (!errors[key]) errors[key] = issue.message;
        }
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }

    // 2. Zod / Valibot safeParse
    if (typeof s.safeParse === 'function') {
      const res = s.safeParse(values);
      if (!res.success && res.error) {
        const issues = res.error.issues ?? res.error.errors ?? [];
        for (const issue of issues) {
          const key = issue.path?.[0] != null ? String(issue.path[0]) : '_root';
          if (!errors[key]) errors[key] = issue.message;
        }
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }

    // 3. Joi / generic .validate()
    if (typeof s.validate === 'function') {
      const res = s.validate(values);
      if (res && typeof res === 'object' && res.error) {
        const details = res.error.details;
        if (Array.isArray(details) && details.length > 0) {
          for (const d of details) {
            const key = d.path?.[0] != null ? String(d.path[0]) : '_root';
            if (!errors[key]) errors[key] = d.message;
          }
        } else if (res.error.message) {
          errors._root = res.error.message;
        }
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }

    // 4. Synchronous .parse() that throws (e.g. standard Zod parse or Yup validateSync)
    if (typeof s.parse === 'function') {
      try {
        s.parse(values);
      } catch (err: unknown) {
        if (err && typeof err === 'object') {
          const issues = (err as { issues?: Array<{ path?: Array<string | number>; message: string }>; errors?: Array<{ path?: Array<string | number>; message: string }> }).issues ??
            (err as { errors?: Array<{ path?: Array<string | number>; message: string }> }).errors;
          if (Array.isArray(issues)) {
            for (const issue of issues) {
              const key = issue.path?.[0] != null ? String(issue.path[0]) : '_root';
              if (!errors[key]) errors[key] = issue.message;
            }
          } else if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
            errors._root = (err as { message: string }).message;
          }
        }
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }

    return null;
  };
}

/**
 * Creates a synchronous form validator function specifically optimized for TypeBox
 * compiled validators (from TypeCompiler.Compile) or TypeBox value checks.
 *
 * @example
 * ```ts
 * import { Type } from '@sinclair/typebox';
 * import { TypeCompiler } from '@sinclair/typebox/compiler';
 * import { createTypeBoxValidator, useForm } from '@svadmin/core';
 *
 * const userSchema = Type.Object({
 *   name: Type.String({ minLength: 2 }),
 *   email: Type.String({ format: 'email' }),
 * });
 *
 * const compiledUser = TypeCompiler.Compile(userSchema);
 *
 * const form = useForm({
 *   resource: 'users',
 *   validate: createTypeBoxValidator(compiledUser),
 * });
 * ```
 */
export function createTypeBoxValidator(
  compiledOrSchema: TypeBoxValidatorLike | SchemaValidatorLike | unknown
): (values: Record<string, unknown>) => Record<string, string> | null {
  return createSchemaValidator(compiledOrSchema);
}
