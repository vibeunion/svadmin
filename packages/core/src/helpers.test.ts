// Unit tests for helpers-pure.ts — pure functions, no Svelte runtime
import { describe, test, expect } from 'bun:test';
import {
  getDefaultFilter, getDefaultSortOrder,
  unionFilters, unionSorters,
  parseCSV,
  createTypeBoxValidator,
} from './helpers-pure';
import { Type, FormatRegistry } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import type { Filter, Sort } from './types';

// Register format helpers for TypeBox tests
if (!FormatRegistry.Has('email')) {
  FormatRegistry.Set('email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
}

// ─── getDefaultFilter ─────────────────────────────────────────

describe('getDefaultFilter', () => {
  const filters: Filter[] = [
    { field: 'status', operator: 'eq', value: 'published' },
    { field: 'price', operator: 'gte', value: 100 },
    { field: 'title', operator: 'contains', value: 'hello' },
  ];

  test('returns value for matching field+operator', () => {
    expect(getDefaultFilter('status', filters)).toBe('published');
    expect(getDefaultFilter('price', filters, 'gte')).toBe(100);
  });

  test('returns undefined for non-matching field', () => {
    expect(getDefaultFilter('nonexistent', filters)).toBeUndefined();
  });

  test('returns undefined for wrong operator', () => {
    expect(getDefaultFilter('status', filters, 'contains')).toBeUndefined();
  });

  test('returns undefined for empty/undefined filters', () => {
    expect(getDefaultFilter('status', [])).toBeUndefined();
    expect(getDefaultFilter('status', undefined)).toBeUndefined();
  });
});

// ─── getDefaultSortOrder ──────────────────────────────────────

describe('getDefaultSortOrder', () => {
  const sorters: Sort[] = [
    { field: 'name', order: 'asc' },
    { field: 'createdAt', order: 'desc' },
  ];

  test('returns order for matching field', () => {
    expect(getDefaultSortOrder('name', sorters)).toBe('asc');
    expect(getDefaultSortOrder('createdAt', sorters)).toBe('desc');
  });

  test('returns undefined for non-matching field', () => {
    expect(getDefaultSortOrder('unknown', sorters)).toBeUndefined();
  });

  test('returns undefined for empty/undefined sorters', () => {
    expect(getDefaultSortOrder('name', undefined)).toBeUndefined();
    expect(getDefaultSortOrder('name', [])).toBeUndefined();
  });
});

// ─── unionFilters ─────────────────────────────────────────────

describe('unionFilters', () => {
  test('merges new filters over previous', () => {
    const prev: Filter[] = [
      { field: 'status', operator: 'eq', value: 'draft' },
    ];
    const next: Filter[] = [
      { field: 'status', operator: 'eq', value: 'published' },
    ];
    const result = unionFilters([], next, prev);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('published');
  });

  test('permanent filters override everything', () => {
    const permanent: Filter[] = [
      { field: 'org', operator: 'eq', value: 'acme' },
    ];
    const next: Filter[] = [
      { field: 'org', operator: 'eq', value: 'other' },
    ];
    const result = unionFilters(permanent, next, []);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('acme');
  });

  test('removes filters with undefined value', () => {
    const prev: Filter[] = [
      { field: 'status', operator: 'eq', value: 'draft' },
    ];
    const next: Filter[] = [
      { field: 'status', operator: 'eq', value: undefined },
    ];
    const result = unionFilters([], next, prev);
    expect(result).toHaveLength(0);
  });

  test('adds new filters not in previous', () => {
    const prev: Filter[] = [
      { field: 'status', operator: 'eq', value: 'draft' },
    ];
    const next: Filter[] = [
      { field: 'category', operator: 'eq', value: 'tech' },
    ];
    const result = unionFilters([], next, prev);
    expect(result).toHaveLength(2);
  });

  test('handles empty arrays', () => {
    expect(unionFilters([], [], [])).toEqual([]);
  });
});

// ─── unionSorters ─────────────────────────────────────────────

describe('unionSorters', () => {
  test('new sorters take priority', () => {
    const permanent: Sort[] = [{ field: 'id', order: 'asc' }];
    const newSorters: Sort[] = [{ field: 'name', order: 'desc' }];
    const result = unionSorters(permanent, newSorters);
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('name');
  });

  test('permanent sorters override new sorters on same field', () => {
    const permanent: Sort[] = [{ field: 'name', order: 'asc' }];
    const newSorters: Sort[] = [{ field: 'name', order: 'desc' }];
    const result = unionSorters(permanent, newSorters);
    expect(result).toHaveLength(1);
    expect(result[0].order).toBe('asc');
  });

  test('empty arrays', () => {
    expect(unionSorters([], [])).toEqual([]);
  });
});

// ─── parseCSV ─────────────────────────────────────────────────

describe('parseCSV', () => {
  test('parses simple CSV', () => {
    const rows = parseCSV('name,age\nAlice,30\nBob,25');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['name', 'age']);
    expect(rows[1]).toEqual(['Alice', '30']);
    expect(rows[2]).toEqual(['Bob', '25']);
  });

  test('handles quoted fields', () => {
    const rows = parseCSV('name,bio\nAlice,"Hello, World"');
    expect(rows).toHaveLength(2);
    expect(rows[1][1]).toBe('Hello, World');
  });

  test('handles escaped quotes', () => {
    const rows = parseCSV('val\n"He said ""hello"""');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('He said "hello"');
  });

  test('handles CRLF line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n3,4');
    expect(rows).toHaveLength(3);
  });

  test('skips empty rows', () => {
    const rows = parseCSV('a\n\nb\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['a']);
    expect(rows[1]).toEqual(['b']);
  });

  test('handles empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });
});

// ─── createTypeBoxValidator ──────────────────────────────────

describe('createTypeBoxValidator', () => {
  test('validates real TypeBox TypeCompiler compiled schemas', () => {
    const UserSchema = Type.Object({
      username: Type.String({ minLength: 3, errorMessage: 'Username too short' }),
      email: Type.String({ format: 'email' }),
      age: Type.Optional(Type.Integer({ minimum: 18 })),
    });

    const compiled = TypeCompiler.Compile(UserSchema);
    const validate = createTypeBoxValidator(compiled);

    // Invalid: missing username and email
    const errors1 = validate({});
    expect(errors1).not.toBeNull();
    expect(errors1?.username).toBeDefined();
    expect(errors1?.email).toBeDefined();

    // Invalid: underage
    const errors2 = validate({ username: 'alice', email: 'alice@example.com', age: 16 });
    expect(errors2?.age).toBeDefined();

    // Valid
    const validResult = validate({ username: 'alice', email: 'alice@example.com', age: 25 });
    expect(validResult).toBeNull();
  });

  test('validates nested fields with clean dot-separated path names in TypeBox', () => {
    const OrgSchema = Type.Object({
      profile: Type.Object({
        orgName: Type.String({ minLength: 1 }),
      }),
    });
    const compiled = TypeCompiler.Compile(OrgSchema);
    const validate = createTypeBoxValidator(compiled);

    const errors = validate({ profile: { orgName: '' } });
    expect(errors).not.toBeNull();
    expect(errors?.['profile.orgName']).toBeDefined();
  });

  test('supports TypeBox Errors providers without Check', () => {
    const validate = createTypeBoxValidator({
      Errors: (value) => {
        const values = value as Record<string, unknown>;
        return values.name
          ? []
          : [{ path: '/name', message: 'Name is required' }];
      },
    });

    expect(validate({})).toEqual({ name: 'Name is required' });
    expect(validate({ name: 'Alice' })).toBeNull();
  });
});
