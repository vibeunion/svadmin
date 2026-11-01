import { describe, expect, test } from 'bun:test';
import {
  FILTER_PROVIDER_IDS,
  PROVIDER_FILTER_CAPABILITIES,
  assertFiltersExecutable,
  providerSupportsOperator,
} from './provider-filter-capabilities';
import { CRUD_FIELD_OPERATORS } from './types';

describe('provider filter capabilities', () => {
  test('declares every first-party translator and fails closed outside its matrix', () => {
    expect(FILTER_PROVIDER_IDS).toEqual([
      'pocketbase', 'directus', 'sanity', 'elysia', 'supabase-table', 'scaffold-memory',
    ]);
    expect(PROVIDER_FILTER_CAPABILITIES.elysia.operators).toEqual(CRUD_FIELD_OPERATORS);
    expect(providerSupportsOperator('directus', 'containss')).toBe(true);
    expect(providerSupportsOperator('directus', 'eqs')).toBe(false);
    expect(providerSupportsOperator('pocketbase', 'nstartswith')).toBe(true);
    expect(providerSupportsOperator('pocketbase', 'containss')).toBe(false);

    assertFiltersExecutable('pocketbase', [{
      key: 'group',
      operator: 'or',
      value: [{ field: 'title', operator: 'contains', value: 'Hello' }],
    }]);
    expect(() => assertFiltersExecutable('pocketbase', [
      { field: 'title', operator: 'containss', value: 'Hello' },
    ])).toThrow('Unsupported pocketbase filter operator: containss');
    expect(() => assertFiltersExecutable('supabase-table', [{
      operator: 'or',
      value: [{ field: 'id', operator: 'eq', value: 1 }],
    }])).toThrow('Unsupported supabase-table logical operator: or');
    expect(() => assertFiltersExecutable('sanity', [
      { field: 'title', operator: 'regex', value: '^A' } as never,
    ])).toThrow('Unsupported sanity filter operator: regex');
  });
});
