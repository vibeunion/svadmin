// Tests nested-resource URL parsing, which underpins automatic parent-filter injection.
import { describe, test, expect } from 'bun:test';

/**
 * Mirrors the nested-resource path parsing implemented by useParsed.
 * /teams/123/users -> resource=users, parentParams.teamId=123
 */
function singularize(word: string): string {
  if (word.endsWith('ies') && word.length > 3) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 2) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1);
  return word;
}

function parseNestedRoute(hash: string, knownResources: string[]) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart = '/', queryString] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const result: { resource?: string; resourcePath?: string; params: Record<string, string>; parentParams: Record<string, string> } = { params: {}, parentParams: {} };

  // Query params are isolated in params.
  if (queryString) {
    for (const [k, v] of new URLSearchParams(queryString).entries()) {
      result.params[k] = v;
    }
  }

  if (segments.length === 0) return result;

  // Find the rightmost known resource segment.
  let resourceIndex = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment !== undefined && knownResources.includes(segment)) {
      resourceIndex = i;
      break;
    }
  }

  if (resourceIndex !== -1) {
    const resource = segments[resourceIndex];
    if (resource !== undefined) result.resource = resource;
    result.resourcePath = segments.slice(0, resourceIndex + 1).join('/');

    // Extract parent params from /<parentResource>/<parentId>/...
    // Keep parent path params separate from query params so queries are not treated as parent filters.
    for (let i = 0; i < resourceIndex; i += 2) {
      const parentName = segments[i];
      const parentId = segments[i + 1];
      if (parentName && parentId) {
        const singular = singularize(parentName);
        result.parentParams[`${singular}Id`] = parentId;
      }
    }
  }

  return result;
}

describe('Nested resource URL parsing (parent filter)', () => {
  test('flat resource has no parent params', () => {
    const result = parseNestedRoute('#/users', ['users']);
    expect(result.resource).toBe('users');
    expect(result.params).toEqual({});
  });

  test('single-level nested: /teams/123/users', () => {
    const result = parseNestedRoute('#/teams/123/users', ['teams', 'users']);
    expect(result.resource).toBe('users');
    expect(result.resourcePath).toBe('teams/123/users');
    expect(result.parentParams['teamId']).toBe('123');
    expect(result.params).toEqual({});
  });

  test('nested resource with action', () => {
    const result = parseNestedRoute('#/categories/5/posts/create', ['categories', 'posts']);
    expect(result.resource).toBe('posts');
    expect(result.parentParams['categoryId']).toBe('5');
  });

  test('double nested: /orgs/9/teams/3/users', () => {
    const result = parseNestedRoute('#/orgs/9/teams/3/users', ['orgs', 'teams', 'users']);
    expect(result.resource).toBe('users');
    expect(result.resourcePath).toBe('orgs/9/teams/3/users');
    expect(result.parentParams['orgId']).toBe('9');
    expect(result.parentParams['teamId']).toBe('3');
  });

  test('parent param key uses singular form', () => {
    const result = parseNestedRoute('#/companies/42/members', ['companies', 'members']);
    expect(result.parentParams['companyId']).toBe('42');
  });

  test('resource without trailing s for parent', () => {
    const result = parseNestedRoute('#/data/7/records', ['data', 'records']);
    expect(result.parentParams['dataId']).toBe('7');
  });
});

describe('Parent filter injection contract', () => {
  test('parentParams ending in Id become eq filters', () => {
    const parentParams: Record<string, string> = { teamId: '123' };
    const filters = Object.entries(parentParams)
      .filter(([k]) => k.endsWith('Id'))
      .map(([k, v]) => ({ field: k, operator: 'eq' as const, value: v }));
    expect(filters).toEqual([{ field: 'teamId', operator: 'eq', value: '123' }]);
  });

  test('non-Id parentParams are not converted to filters', () => {
    const parentParams: Record<string, string> = { page: '2', sort: 'name', teamId: '5' };
    const filters = Object.entries(parentParams)
      .filter(([k]) => k.endsWith('Id'))
      .map(([k, v]) => ({ field: k, operator: 'eq' as const, value: v }));
    expect(filters).toEqual([{ field: 'teamId', operator: 'eq', value: '5' }]);
    expect(filters).toHaveLength(1);
  });
});

describe('Query params must not leak into parent filters (P1 regression)', () => {
  test('query param ending in Id is NOT treated as parent param', () => {
    // #/users?tenantId=1 — flat route, tenantId is a query param, not a parent
    const result = parseNestedRoute('#/users?tenantId=1', ['users']);
    expect(result.parentParams).toEqual({});
    expect(result.params['tenantId']).toBe('1');
  });

  test('query params on nested route stay separate from parent path params', () => {
    // #/teams/123/users?status=active&page=2
    const result = parseNestedRoute('#/teams/123/users?status=active&page=2', ['teams', 'users']);
    expect(result.parentParams).toEqual({ teamId: '123' });
    expect(result.params).toEqual({ status: 'active', page: '2' });
  });

  test('parent filter injection only uses parentParams', () => {
    // Simulate the query-hooks injection contract: only parentParams -> eq filters
    const parsed = parseNestedRoute('#/users?tenantId=1', ['users']);
    const filters = Object.entries(parsed.parentParams)
      .filter(([k]) => k.endsWith('Id'))
      .map(([k, v]) => ({ field: k, operator: 'eq' as const, value: v }));
    expect(filters).toEqual([]);
  });

  test('nested route parent param becomes eq filter', () => {
    const parsed = parseNestedRoute('#/teams/123/users', ['teams', 'users']);
    const filters = Object.entries(parsed.parentParams)
      .filter(([k]) => k.endsWith('Id'))
      .map(([k, v]) => ({ field: k, operator: 'eq' as const, value: v }));
    expect(filters).toEqual([{ field: 'teamId', operator: 'eq', value: '123' }]);
  });
});
