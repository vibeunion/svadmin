import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/svelte';
import { requireValue } from '../../../../scripts/test-assertions';
import { createSavedListViews } from './saved-list-views.svelte.js';
import {
  activeSavedListViewStorageKey,
  savedListViewsStorageKey,
  serializeSavedListViews,
  type ListPreferenceScope,
  type SavedListView,
  type SavedListViewProvider,
  type SavedListViewState,
} from './saved-list-views.js';

const scopeA: ListPreferenceScope = { resourceName: 'users', providerName: 'default', tenantIdentity: 'a' };
const scopeB: ListPreferenceScope = { ...scopeA, tenantIdentity: 'b' };
const disposers: Array<() => void> = [];

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(complete => { resolve = complete; });
  return { promise, resolve };
}

function state(search = ''): SavedListViewState {
  return {
    search, filters: [], sorters: [], pagination: { current: 1, pageSize: 10 },
    columnVisibility: {}, columnOrder: ['id', 'email'],
  };
}

function remoteView(id = 'team-view'): SavedListView {
  return { id, name: id, state: state(id), source: 'team', version: 1, readOnly: false };
}

function createModel(input: {
  provider?: SavedListViewProvider;
  explicitURL?: boolean;
  allowDefault?: boolean;
  ready?: boolean;
} = {}) {
  let scope = $state(scopeA);
  let provider = $state.raw(input.provider);
  let ready = $state(input.ready ?? true);
  const columns = new Set(['id', 'email']);
  const applyState = vi.fn<(state: SavedListViewState) => void>();
  const captureState = vi.fn(() => state('current'));
  let model!: ReturnType<typeof createSavedListViews>;
  const dispose = $effect.root(() => {
    model = createSavedListViews({
      scope: () => scope,
      columns: () => columns,
      provider: () => provider,
      isScopeLoaded: () => ready,
      readPreference: (_scope, key) => localStorage.getItem(key),
      hasExplicitURLState: input.explicitURL ?? false,
      canApplyRemoteDefault: () => input.allowDefault ?? false,
      captureState,
      applyState,
    });
  });
  disposers.push(dispose);
  flushSync();
  return {
    model, applyState, captureState, dispose,
    changeScope(next: ListPreferenceScope) {
      scope = next;
      model.restoreScope(next);
      flushSync();
    },
    changeProvider(next: SavedListViewProvider) { provider = next; flushSync(); },
    setReady(next: boolean) { ready = next; flushSync(); },
  };
}

function store(view: SavedListView, scope = scopeA): void {
  localStorage.setItem(savedListViewsStorageKey(scope), serializeSavedListViews([view]));
  localStorage.setItem(activeSavedListViewStorageKey(scope), view.id);
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.restoreAllMocks();
});

describe('saved list view model', () => {
  it.each([false, true])('restores local state with explicit URL = %s', explicitURL => {
    const view = { id: 'local', name: 'Local', state: state('stored') };
    store(view);
    const { model } = createModel({ explicitURL });
    expect(model.availableSavedViews).toEqual([view]);
    expect(model.initialSavedView).toEqual(explicitURL ? undefined : view);
    expect(model.activeSavedViewId).toBe(explicitURL ? undefined : view.id);
  });

  it('saves, replaces by name, and deletes only within the current scope', () => {
    const { model } = createModel();
    model.savedViewName = '  Review  ';
    model.saveCurrentView();
    const id = model.activeSavedViewId;
    model.savedViewName = 'review';
    model.saveCurrentView();
    expect(model.availableSavedViews).toHaveLength(1);
    expect(model.activeSavedViewId).toBe(id);
    expect(localStorage.getItem(activeSavedListViewStorageKey(scopeA))).toBe(id);
    expect(localStorage.getItem(savedListViewsStorageKey(scopeB))).toBeNull();
    model.deleteSavedView(id ?? '');
    expect(model.availableSavedViews).toEqual([]);
    expect(localStorage.getItem(activeSavedListViewStorageKey(scopeA))).toBeNull();
  });

  it('retains the in-memory view when storage writes fail', () => {
    const { model } = createModel();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    model.savedViewName = 'Unsynced';
    expect(() => model.saveCurrentView()).not.toThrow();
    expect(model.activeSavedViewName).toBe('Unsynced');
    expect(model.availableSavedViews).toHaveLength(1);
    expect(localStorage.getItem(savedListViewsStorageKey(scopeA))).toBeNull();
  });

  it('restores a new tenant without overwriting either persisted view', () => {
    const first = { id: 'a', name: 'A', state: state('first') };
    const second = { id: 'b', name: 'B', state: state('second') };
    store(first);
    store(second, scopeB);
    const before = localStorage.getItem(savedListViewsStorageKey(scopeA));
    const { model, changeScope } = createModel();
    model.savedViewName = 'Unfinished';
    model.savedViewsOpen = true;
    changeScope(scopeB);
    expect(model.availableSavedViews).toEqual([second]);
    expect(model.activeSavedViewId).toBe('b');
    expect(model.savedViewName).toBe('');
    expect(model.savedViewsOpen).toBe(false);
    expect(localStorage.getItem(savedListViewsStorageKey(scopeA))).toBe(before);
    expect(localStorage.getItem(activeSavedListViewStorageKey(scopeB))).toBe('b');
  });

  it('does not load or save while the owning scope is unresolved', async () => {
    const list = vi.fn(async () => []);
    const { model, setReady } = createModel({ provider: { list }, ready: false });
    model.savedViewName = 'Not ready';
    model.saveCurrentView();
    expect(model.availableSavedViews).toEqual([]);
    expect(list).not.toHaveBeenCalled();
    setReady(true);
    await waitFor(() => expect(list).toHaveBeenCalledOnce());
  });

  it.each(['tenant', 'provider', 'unmount'] as const)('ignores delayed list results after %s changes', async boundary => {
    const pending = deferred();
    const list = vi.fn((scope: ListPreferenceScope) => (
      scope.tenantIdentity === 'a' ? pending.promise : Promise.resolve([])
    ));
    const harness = createModel({ provider: { list }, allowDefault: true });
    await waitFor(() => expect(list).toHaveBeenCalledOnce());
    if (boundary === 'tenant') {
      harness.changeScope(scopeB);
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(harness.model.remoteViewsLoading).toBe(false));
    } else if (boundary === 'provider') {
      harness.changeProvider({ list: async () => [] });
      await waitFor(() => expect(harness.model.remoteViewsLoading).toBe(false));
    } else harness.dispose();
    pending.resolve([{ ...remoteView(), default: true }]);
    await pending.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(harness.applyState).not.toHaveBeenCalled();
    expect(harness.model.availableSavedViews).toEqual([]);
  });

  it.each(['none', 'url', 'local', 'dirty', 'cleared'] as const)('honors remote default precedence with %s state', async precedence => {
    if (precedence === 'local') store({ id: 'local', name: 'Local', state: state('local') });
    const pending = deferred();
    const { model, applyState } = createModel({
      provider: { list: () => pending.promise }, allowDefault: true, explicitURL: precedence === 'url',
    });
    if (precedence === 'dirty') model.markSavedViewDirty();
    if (precedence === 'cleared') model.clearActiveSavedView();
    pending.resolve([{ ...remoteView(), default: true }]);
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    expect(applyState).toHaveBeenCalledTimes(precedence === 'none' ? 1 : 0);
  });

  it.each(['failure', 'conflict'] as const)('preserves the draft after a remote save %s', async outcome => {
    const view = remoteView();
    const save = vi.fn(async () => {
      if (outcome === 'failure') throw new Error('offline');
      return { ok: false, code: 'VERSION_CONFLICT', current: { ...view, version: 2 }, version: 2 };
    });
    const { model, applyState } = createModel({ provider: { list: async () => [view], save } });
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    model.savedViewSource = 'team';
    model.savedViewName = view.name;
    model.saveCurrentView();
    await waitFor(() => expect(model.savedViewMutationError).toBe(outcome));
    expect(model.savedViewName).toBe(view.name);
    expect(model.savedViewMutationPending).toBe(false);
    expect(model.availableSavedViews[0]?.version).toBe(1);
    expect(applyState).not.toHaveBeenCalled();
  });

  it.each([false, true])('requires opt-in and a unique remote default, opt-in = %s', async allowDefault => {
    const { model, applyState } = createModel({
      allowDefault,
      provider: { list: async () => [
        { ...remoteView('first'), default: true },
        ...(allowDefault ? [{ ...remoteView('second'), default: true }] : []),
      ] },
    });
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    expect(model.availableSavedViews).toHaveLength(allowDefault ? 2 : 1);
    expect(applyState).not.toHaveBeenCalled();
  });

  it('ignores a save response from the previous tenant', async () => {
    const pending = deferred();
    const view = remoteView();
    const save = vi.fn(() => pending.promise);
    const { model, changeScope } = createModel({
      provider: { list: async scope => scope.tenantIdentity === 'a' ? [view] : [], save },
    });
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    model.savedViewSource = 'team';
    model.savedViewName = view.name;
    model.saveCurrentView();
    expect(save).toHaveBeenCalledOnce();
    changeScope(scopeB);
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    model.savedViewName = 'Tenant B draft';
    pending.resolve({ ok: true, view: { ...view, version: 2 }, version: 2 });
    await waitFor(() => expect(model.savedViewMutationPending).toBe(false));
    await pending.promise;
    expect(model.availableSavedViews).toEqual([]);
    expect(model.savedViewName).toBe('Tenant B draft');
    expect(model.savedViewMutationError).toBeUndefined();
  });

  it('saves a versioned remote snapshot and removes the active remote view', async () => {
    const view = remoteView();
    const save = vi.fn(async (_scope: ListPreferenceScope, mutation: { state: SavedListViewState }) => ({
      ok: true, view: { ...view, state: mutation.state, version: 2 }, version: 2,
    }));
    const remove = vi.fn(async () => ({ ok: true, id: view.id, version: 3 }));
    const { model } = createModel({ provider: { list: async () => [view], save, remove } });
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    model.savedViewSource = 'team';
    model.savedViewName = view.name;
    model.saveCurrentView();
    await waitFor(() => expect(model.savedViewMutationPending).toBe(false));
    expect(save).toHaveBeenCalledWith(scopeA, expect.objectContaining({
      id: view.id, expectedVersion: 1, source: 'team', state: state('current'),
    }));
    const saved = requireValue(model.availableSavedViews[0]);
    expect(saved.version).toBe(2);
    expect(model.savedViewName).toBe('');
    model.applySavedView(saved);
    model.deleteSavedView(saved.id);
    await waitFor(() => expect(model.availableSavedViews).toEqual([]));
    expect(remove).toHaveBeenCalledWith(scopeA, { id: view.id, expectedVersion: 2 });
    expect(model.activeSavedViewId).toBeUndefined();
    expect(localStorage.getItem(activeSavedListViewStorageKey(scopeA))).toBeNull();
  });

  it('reloads all remote views after a versioned default change', async () => {
    let view = remoteView();
    const list = vi.fn(async () => [view]);
    const setDefault = vi.fn(async () => {
      view = { ...view, default: true, version: 2 };
      return { ok: true, view, version: 2 };
    });
    const { model } = createModel({ provider: { list, setDefault } });
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    model.setRemoteDefault(requireValue(model.availableSavedViews[0]));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(model.availableSavedViews[0]?.default).toBe(true));
    expect(setDefault).toHaveBeenCalledWith(scopeA, {
      id: view.id, source: 'team', expectedVersion: 1, default: true,
    });
    expect(model.savedViewMutationError).toBeUndefined();
  });

  it('ignores an older subject search for the same remote view', async () => {
    const pending = deferred();
    const view = remoteView();
    const listAccessSubjects = vi.fn(async (_scope: ListPreferenceScope, input: { query?: string }) => (
      input.query === 'old' ? pending.promise : [{ id: 'new', label: 'New member' }]
    ));
    const { model } = createModel({
      provider: { list: async () => [view], listAccessSubjects },
    });
    await waitFor(() => expect(model.remoteViewsLoading).toBe(false));
    model.loadAccessSubjects(view, 'old');
    await waitFor(() => expect(listAccessSubjects).toHaveBeenCalledOnce());
    model.loadAccessSubjects(view, 'new');
    await waitFor(() => expect(model.accessSubjects.get(view.id)?.[0]?.id).toBe('new'));
    pending.resolve([{ id: 'old', label: 'Old member' }]);
    await pending.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(model.accessSubjects.get(view.id)).toEqual([{ id: 'new', label: 'New member' }]);
    expect(model.accessSubjectsLoading.has(view.id)).toBe(false);
  });

  it('applies a detached state snapshot without mutating a stored view', () => {
    const { model, applyState } = createModel();
    const view = remoteView();
    model.applySavedView(view);
    const snapshot = requireValue(applyState.mock.calls[0]?.[0]);
    snapshot.columnOrder.push('extra');
    expect(view.state.columnOrder).toEqual(['id', 'email']);
    expect(model.activeSavedViewId).toBe(view.id);
    model.markSavedViewDirty();
    expect(model.activeSavedViewId).toBeUndefined();
  });
});
