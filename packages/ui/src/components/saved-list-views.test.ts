import { describe, expect, it } from 'vitest';
import {
  activeSavedListViewStorageKey,
  canMigrateLegacyListPreferences,
  columnOrderStorageKey,
  columnVisibilityStorageKey,
  legacyActiveSavedListViewStorageKey,
  legacyColumnOrderStorageKey,
  legacyColumnVisibilityStorageKey,
  legacySavedListViewsStorageKey,
  listPreferenceScopeId,
  readSavedListViews,
  savedListViewsStorageKey,
  serializeSavedListViews,
  type SavedListView,
} from './saved-list-views';

const allowedColumns = new Set(['id', 'email', '_actions']);

describe('saved list views', () => {
  it('round-trips valid state and removes unknown column ids', () => {
    const views: SavedListView[] = [{
      id: 'review',
      name: 'Review queue',
      state: {
        search: 'pending',
        filters: [{ field: 'email', operator: 'contains', value: '@example.com' }],
        sorters: [{ field: 'email', order: 'desc' }],
        pagination: { current: 2, pageSize: 20 },
        columnVisibility: { id: false, removed: true },
        columnOrder: ['email', 'removed', 'id'],
      },
    }];

    expect(readSavedListViews(serializeSavedListViews(views), allowedColumns)).toEqual([{
      ...views[0],
      state: {
        ...views[0].state,
        columnVisibility: { id: false },
        columnOrder: ['email', 'id'],
      },
    }]);
  });

  it('fails closed for malformed JSON and unknown filter or sorter fields', () => {
    expect(readSavedListViews('{bad-json', allowedColumns)).toEqual([]);
    expect(readSavedListViews(JSON.stringify({
      version: 1,
      views: [{
        id: 'unsafe',
        name: 'Unsafe',
        state: {
          search: '',
          filters: [{ field: 'password', operator: 'contains', value: 'secret' }],
          sorters: [{ field: 'password', order: 'asc' }],
          pagination: { current: 1, pageSize: 20 },
          columnVisibility: {},
          columnOrder: [],
        },
      }],
    }), allowedColumns)).toEqual([]);
  });

  it('encodes resource, provider and tenant identity in every preference key', () => {
    const scope = { resourceName: 'users/archive', providerName: 'analytics us', tenantIdentity: 'acme/1' };

    expect(listPreferenceScopeId(scope)).toBe('r:users%2Farchive|p:analytics%20us|t:s:acme%2F1');
    expect(savedListViewsStorageKey(scope)).toContain(listPreferenceScopeId(scope));
    expect(activeSavedListViewStorageKey(scope)).toContain(listPreferenceScopeId(scope));
    expect(columnVisibilityStorageKey(scope)).toContain(listPreferenceScopeId(scope));
    expect(columnOrderStorageKey(scope)).toContain(listPreferenceScopeId(scope));
  });

  it('isolates providers, tenants and tenant value types', () => {
    const base = { resourceName: 'users', providerName: 'default' } as const;
    const keys = [
      savedListViewsStorageKey(base),
      savedListViewsStorageKey({ ...base, providerName: 'analytics' }),
      savedListViewsStorageKey({ ...base, tenantIdentity: '1' }),
      savedListViewsStorageKey({ ...base, tenantIdentity: 1 }),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('allows legacy migration only for the default provider without a tenant', () => {
    expect(canMigrateLegacyListPreferences({ resourceName: 'users', providerName: 'default' })).toBe(true);
    expect(canMigrateLegacyListPreferences({ resourceName: 'users', providerName: 'analytics' })).toBe(false);
    expect(canMigrateLegacyListPreferences({ resourceName: 'users', providerName: 'default', tenantIdentity: 'acme' })).toBe(false);
    expect(canMigrateLegacyListPreferences({ resourceName: 'users', providerName: 'default', tenantIdentity: 1 })).toBe(false);
  });

  it('keeps legacy key names stable for one-time migration', () => {
    expect(legacySavedListViewsStorageKey('users')).toBe('svadmin-list-views-users');
    expect(legacyActiveSavedListViewStorageKey('users')).toBe('svadmin-list-view-active-users');
    expect(legacyColumnVisibilityStorageKey('users')).toBe('svadmin-columns-users');
    expect(legacyColumnOrderStorageKey('users')).toBe('svadmin-colorder-users');
  });
});
