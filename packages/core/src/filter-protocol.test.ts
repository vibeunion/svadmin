import { describe, expect, test } from 'bun:test';
import { Type } from 'typebox';
import { createResourceRequestValidator } from './resource-schemas';
import { snapshotListParams } from './query-snapshot';
import type { DataProvider, GetListParams } from './types';

const refineFilters = [
  { field: 'title', operator: 'containss' as const, value: 'Draft' },
  { field: 'status', operator: 'eqs' as const, value: 'Open' },
  { field: 'tags', operator: 'nina' as const, value: ['a'] },
  { field: 'name', operator: 'nstartswith' as const, value: 'x' },
  {
    key: 'parent',
    operator: 'or' as const,
    value: [
      { field: 'city', operator: 'ncontainss' as const, value: 'HQ' },
      { key: 'child', operator: 'and' as const, value: [{ field: 'code', operator: 'endswiths' as const, value: 'Z' }] },
    ],
  },
] satisfies GetListParams['filters'];

describe('Refine filter protocol', () => {
  test('types a provider getList call with keyed conditional filters', () => {
    const params: GetListParams = { resource: 'posts', filters: refineFilters };
    const provider: Pick<DataProvider, 'getList'> = {
      getList: async () => ({ data: [], total: 0 }),
    };
    expect(provider.getList(params)).resolves.toEqual({ data: [], total: 0 });
  });

  test('query snapshot keeps Refine operators and conditional keys', () => {
    expect(snapshotListParams({ resource: 'posts', filters: refineFilters }).filters).toEqual(refineFilters);
    expect(() => snapshotListParams({
      resource: 'posts',
      filters: [{ field: 'title', operator: 'drop-table', value: 'x' }],
    })).toThrow(/Invalid resource query/);
    expect(() => snapshotListParams({
      resource: 'posts',
      filters: [{ key: '', operator: 'or', value: [{ field: 'title', operator: 'eq', value: 'x' }] }],
    })).toThrow(/Invalid resource query/);
  });

  test('resource schema boundary accepts the same filter model', () => {
    const prepare = createResourceRequestValidator({
      posts: { record: Type.Object({ id: Type.String() }, { additionalProperties: false }) },
    });
    expect(prepare('getList', { resource: 'posts', filters: refineFilters }).filters).toEqual(refineFilters);
    expect(() => prepare('getList', {
      resource: 'posts',
      filters: [{ field: 'title', operator: 'unrecognized', value: 'x' }],
    })).toThrow(/Invalid resource input/);
  });
});
