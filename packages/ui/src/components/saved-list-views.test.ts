import { requireValue } from "../../../../scripts/test-assertions";
import { describe, expect, it } from 'vitest';
import {
  activeSavedListViewStorageKey,
  canMigrateLegacyListPreferences,
  columnOrderStorageKey,
  columnVisibilityStorageKey,
  decodeRemoteSavedListViews,
  decodeSavedListViewAccess,
  decodeSavedListViewSubjects,
  decodeSavedListViewMutationResult,
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
  const remoteView = {
    id: 'shared', name: 'Shared', source: 'system', readOnly: false,
    state: {
      search: '', filters: [], sorters: [], pagination: { current: 1, pageSize: 20 },
      columnVisibility: { removed: false }, columnOrder: ['email', 'removed'],
    },
  };

  it('decodes shared views as read-only and preserves system scope without persisting remote flags locally', () => {
    const decoded = decodeRemoteSavedListViews([remoteView], allowedColumns);
    expect(decoded).toEqual([{
      ...remoteView, readOnly: true,
      state: { ...remoteView.state, columnVisibility: {}, columnOrder: ['email'] },
    }]);
    expect(decodeRemoteSavedListViews([{ ...remoteView, source: 'local' }], allowedColumns)[0]?.source).toBe('team');
    expect(readSavedListViews(serializeSavedListViews(decoded), allowedColumns)[0]?.readOnly).toBeUndefined();
  });

  it('preserves an explicit remote default marker without making it writable', () => {
    const decoded = decodeRemoteSavedListViews([{ ...remoteView, default: true }], allowedColumns);
    expect(decoded[0]).toEqual(expect.objectContaining({ default: true, readOnly: true }));
  });

  it('round-trips access metadata without promoting read-only views', () => {
    const access = { mode: 'restricted', subjectIds: ['alice', 'bob'] };
    const view = { ...remoteView, version: 3, access };
    expect(decodeRemoteSavedListViews([view], allowedColumns)[0]).toMatchObject({ access, readOnly: true });
    const receipt = decodeSavedListViewMutationResult({ ok: true, version: 3,
      view: { ...view, state: { ...view.state, columnVisibility: {}, columnOrder: ['email'] } } }, allowedColumns);
    expect(receipt?.ok && receipt.view.access).toEqual(access);
    access.subjectIds.push('eve');
    expect(receipt?.ok && receipt.view.access?.subjectIds).toEqual(['alice', 'bob']);
  });

  it.each([
    { mode: 'restricted', subjectIds: [] },
    { mode: 'organization', subjectIds: ['alice'] },
    { mode: 'team', subjectIds: [], elevated: true },
    { mode: 'restricted', subjectIds: ['alice', 'alice'] },
    { mode: 'restricted', subjectIds: [' alice'] },
    { mode: 'restricted', subjectIds: [1] },
    { mode: 'unknown', subjectIds: [] },
    { mode: 'restricted', subjectIds: Array.from({ length: 201 }, (_, i) => String(i)) },
  ])('rejects malformed access without broadening visibility %j', access => {
    expect(decodeSavedListViewAccess(access)).toBeUndefined();
    expect(decodeRemoteSavedListViews([{ ...remoteView, access }], allowedColumns)).toEqual([]);
    expect(decodeSavedListViewMutationResult({ ok: true, version: 3,
      view: { ...remoteView, version: 3, access } }, allowedColumns)).toBeUndefined();
  });

  it('does not execute access metadata getters', () => {
    let invoked = false;
    expect(decodeSavedListViewAccess({ get mode() { invoked = true; return 'team'; }, subjectIds: [] })).toBeUndefined();
    expect(invoked).toBe(false);
  });

  it('decodes bounded member-directory results without accepting malformed entries', () => {
    expect(decodeSavedListViewSubjects([
      { id: 'alice', label: 'Alice', description: 'Operations' },
      { id: 'alice', label: 'Duplicate' },
      { id: ' bob', label: 'Invalid' },
      { id: 'bob', label: 'Bob', extra: true },
    ])).toBeUndefined();
    expect(decodeSavedListViewSubjects([
      { id: 'alice', label: 'Alice', description: 'Operations' },
      { id: 'bob', label: 'Bob' },
    ])).toEqual([
      { id: 'alice', label: 'Alice', description: 'Operations' },
      { id: 'bob', label: 'Bob' },
    ]);
    expect(decodeSavedListViewSubjects({ items: [] })).toBeUndefined();
    expect(decodeSavedListViewSubjects(Array.from({ length: 201 }, (_, index) => ({
      id: String(index), label: String(index),
    })))).toBeUndefined();
  });

  it('rejects non-data payloads without invoking accessors and validates shared query fields', () => {
    let invoked = false;
    const accessor = { get id() { invoked = true; return 'unsafe'; } };
    const cycle: unknown[] = [];
    cycle.push(cycle);
    for (const input of [null, {}, [accessor], cycle]) {
      expect(decodeRemoteSavedListViews(input, allowedColumns)).toEqual([]);
    }
    expect(invoked).toBe(false);
    for (const state of [
      { ...remoteView.state, search: 'x'.repeat(1001) },
      { ...remoteView.state, filters: [{ field: 'secret', operator: 'eq', value: 1 }] },
      { ...remoteView.state, sorters: [{ field: 'email', order: 'invalid' }] },
    ]) {
      expect(decodeRemoteSavedListViews([{ ...remoteView, state }], allowedColumns)).toEqual([]);
    }
  });

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
        ...requireValue(views[0]).state,
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

  it('isolates authenticated identities and never treats identity as a tenant', () => {
    const base = { resourceName: 'users', providerName: 'default', tenantIdentity: 'acme' } as const;
    const alice = savedListViewsStorageKey({ ...base, identityKey: 'id:alice' });
    const bob = savedListViewsStorageKey({ ...base, identityKey: 'id:bob' });
    const anonymous = savedListViewsStorageKey(base);
    expect(new Set([alice, bob, anonymous]).size).toBe(3);
    expect(alice).toContain('u:s:id%3Aalice');
    expect(canMigrateLegacyListPreferences({ ...base, identityKey: 'id:alice' })).toBe(false);
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

  it('decodes versioned save success and conflict receipts while rejecting untrusted details', () => {
    const state = {
      search: '', filters: [], sorters: [], pagination: { current: 1, pageSize: 20 },
      columnVisibility: {}, columnOrder: [],
    };
    expect(decodeSavedListViewMutationResult({
      ok: true, version: 3, view: { id: 'shared', name: 'Shared', state, version: 3 },
    }, allowedColumns)).toEqual({
      ok: true, version: 3, view: { id: 'shared', name: 'Shared', state, version: 3 },
    });
    expect(decodeSavedListViewMutationResult({
      ok: false, code: 'VERSION_CONFLICT', version: 4,
      current: { id: 'shared', name: 'Updated', state, version: 4 },
    }, allowedColumns)).toEqual({
      ok: false, code: 'VERSION_CONFLICT', version: 4,
      current: { id: 'shared', name: 'Updated', state, version: 4 },
    });
    expect(decodeSavedListViewMutationResult({
      ok: true, version: 3, view: { id: 'shared', name: 'Shared', state, secret: 'token' },
    }, allowedColumns)).toBeUndefined();
    expect(decodeSavedListViewMutationResult({
      ok: false, code: 'VERSION_CONFLICT', version: 4,
      current: { id: 'shared', name: 'Updated', state }, error: 'private',
    }, allowedColumns)).toBeUndefined();
  });

  it('preserves read-only server metadata and returns a detached view', () => {
    const view = { ...remoteView, version: 3, readOnly: true,
      state: { ...remoteView.state, columnVisibility: {}, columnOrder: ['email'] } };
    const decoded = decodeSavedListViewMutationResult({ ok: true, version: 3, view }, allowedColumns);
    expect(decoded).toEqual({ ok: true, version: 3, view });
    view.state.columnOrder.push('id');
    expect(decoded?.ok && decoded.view.state.columnOrder).toEqual(['email']);
  });

  it('correlates mutation receipts with the requested view, source and version', () => {
    const view = { ...remoteView, version: 3, source: 'team' as const,
      state: { ...remoteView.state, columnVisibility: {}, columnOrder: ['email'] } };
    const expected = { id: view.id, source: 'team' as const, expectedVersion: 2 };
    const receipt = { ok: true, version: 3, view };
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns, expected)?.ok).toBe(true);
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns,
      { ...expected, id: 'another-view' })).toBeUndefined();
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns,
      { ...expected, source: 'system' })).toBeUndefined();
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns,
      { ...expected, expectedVersion: 3 })).toBeUndefined();
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns,
      { ...expected, expectedVersion: 4 })).toBeUndefined();
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns,
      { ...expected, expectedVersion: null })?.ok).toBe(true);
    expect(decodeSavedListViewMutationResult(receipt, allowedColumns,
      { ...expected, expectedVersion: 0 })).toBeUndefined();
    const conflict = { ok: false, code: 'VERSION_CONFLICT', version: 3, current: view };
    expect(decodeSavedListViewMutationResult(conflict, allowedColumns, expected)?.ok).toBe(false);
    expect(decodeSavedListViewMutationResult(conflict, allowedColumns,
      { ...expected, id: 'another-view' })).toBeUndefined();
  });

  it.each([
    { version: 2 },
    { version: undefined },
    { readOnly: 'false' },
    { source: 'local' },
    { name: ' Shared ' },
    { secret: 'private' },
  ])('rejects inconsistent receipt view metadata %j', patch => {
    const view = { ...remoteView, version: 3, ...patch,
      state: { ...remoteView.state, columnVisibility: {}, columnOrder: [] } };
    expect(decodeSavedListViewMutationResult({ ok: true, version: 3, view }, allowedColumns)).toBeUndefined();
    expect(decodeSavedListViewMutationResult({
      ok: false, code: 'VERSION_CONFLICT', version: 3, current: view,
    }, allowedColumns)).toBeUndefined();
  });

  it.each([
    { columnVisibility: { removed: false } },
    { columnOrder: ['removed'] },
    { columnOrder: ['email', 'email'] },
    { pagination: { current: 1, pageSize: 20, cursor: 'unhandled' } },
    { sorters: [{ field: 'email', order: 'asc', extra: true }] },
    { filters: [{ field: 'email', operator: 'eq', value: 'a', extra: true }] },
    { extra: true },
  ])('rejects receipt state that would otherwise be silently normalized %j', patch => {
    const view = { ...remoteView, version: 3,
      state: { ...remoteView.state, columnVisibility: {}, columnOrder: [], ...patch } };
    expect(decodeSavedListViewMutationResult({ ok: true, version: 3, view }, allowedColumns)).toBeUndefined();
  });

  it('rejects extra envelope fields even with a valid versioned view', () => {
    const view = { ...remoteView, version: 3,
      state: { ...remoteView.state, columnVisibility: {}, columnOrder: [] } };
    expect(decodeSavedListViewMutationResult({
      ok: true, version: 3, view, error: 'private',
    }, allowedColumns)).toBeUndefined();
    expect(decodeSavedListViewMutationResult({
      ok: false, code: 'VERSION_CONFLICT', version: 3, current: view, error: 'private',
    }, allowedColumns)).toBeUndefined();
  });
});
