// Unit tests for helpers-pure.ts — pure functions, no Svelte runtime
import { describe, test, expect } from 'bun:test';
import {
  getDefaultFilter, getDefaultSortOrder,
  unionFilters, unionSorters,
  parseCSV,
  createSchemaValidator,
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

// ─── createSchemaValidator ────────────────────────────────────

describe('createSchemaValidator', () => {
  test('validates standard schema v1 (~standard)', () => {
    const mockStandardSchema = {
      '~standard': {
        version: 1,
        vendor: 'mock',
        validate: (input: unknown) => {
          const values = input as Record<string, unknown>;
          if (!values.email || typeof values.email !== 'string' || !values.email.includes('@')) {
            return {
              issues: [{ path: ['email'], message: 'Must be a valid email' }],
            };
          }
          return { value: values };
        },
      },
    };

    const validate = createSchemaValidator(mockStandardSchema);
    expect(validate({ email: 'bad-email' })).toEqual({ email: 'Must be a valid email' });
    expect(validate({ email: 'good@example.com' })).toBeNull();
  });

  test('validates Zod / Valibot safeParse style schemas', () => {
    const mockZodSchema = {
      safeParse: (input: unknown) => {
        const values = input as Record<string, unknown>;
        const issues = [];
        if (!values.username) {
          issues.push({ path: ['username'], message: 'Username is required' });
        }
        if (typeof values.age === 'number' && values.age < 18) {
          issues.push({ path: ['age'], message: 'Must be 18+' });
        }
        if (issues.length > 0) {
          return { success: false, error: { issues } };
        }
        return { success: true, data: values };
      },
    };

    const validate = createSchemaValidator(mockZodSchema);
    expect(validate({ age: 16 })).toEqual({
      username: 'Username is required',
      age: 'Must be 18+',
    });
    expect(validate({ username: 'alice', age: 20 })).toBeNull();
  });

  test('validates Joi-like validate schema', () => {
    const mockJoiSchema = {
      validate: (input: unknown) => {
        const values = input as Record<string, unknown>;
        if (!values.title) {
          return {
            error: {
              details: [{ path: ['title'], message: 'Title cannot be empty' }],
            },
          };
        }
        return { value: values };
      },
    };

    const validate = createSchemaValidator(mockJoiSchema);
    expect(validate({})).toEqual({ title: 'Title cannot be empty' });
    expect(validate({ title: 'My Post' })).toBeNull();
  });

  test('validates throwing parse schemas', () => {
    const mockThrowingSchema = {
      parse: (input: unknown) => {
        const values = input as Record<string, unknown>;
        if (!values.token) {
          const err = new Error('Token is missing');
          (err as any).issues = [{ path: ['token'], message: 'Token is missing' }];
          throw err;
        }
        return values;
      },
    };

    const validate = createSchemaValidator(mockThrowingSchema);
    expect(validate({})).toEqual({ token: 'Token is missing' });
    expect(validate({ token: 'abc' })).toBeNull();
  });

  test('returns null for non-schema inputs', () => {
    const validate = createSchemaValidator(null);
    expect(validate({ any: 'value' })).toBeNull();
  });

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
});
