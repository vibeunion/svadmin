import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListColumnPreferences } from './list-column-preferences.svelte.js';
import {
  columnOrderStorageKey, columnVisibilityStorageKey, listPreferenceScopeId,
  type ListPreferenceScope,
} from './saved-list-views.js';

type Options = Parameters<typeof createListColumnPreferences>[0];
const scopeA: ListPreferenceScope = { resourceName: 'users', providerName: 'default', tenantIdentity: 'a' };
const scopeB: ListPreferenceScope = { ...scopeA, tenantIdentity: 'b' };
const disposers: Array<() => void> = [];

function setup(input: Partial<Options> = {}) {
  let scope = $state(scopeA);
  let loadedScopeId = $state(listPreferenceScopeId(scopeA));
  let ready = $state(true);
  const onDirty = vi.fn();
  const readPreference = vi.fn<Options['readPreference']>((_scope, key) => localStorage.getItem(key));
  let model!: ReturnType<typeof createListColumnPreferences>;
  const dispose = $effect.root(() => {
    model = createListColumnPreferences({
      scope: () => scope,
      fields: () => [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'hidden', label: 'Hidden', type: 'text', showInList: false },
      ],
      columns: () => new Set(['id', 'email', 'hidden', '_select', '_actions']),
      isScopeLoaded: () => ready && loadedScopeId === listPreferenceScopeId(scope),
      readPreference, initialViewState: undefined, onDirty, ...input,
    });
  });
  disposers.push(dispose);
  flushSync();
  return {
    model, onDirty, readPreference,
    beginScope(next: ListPreferenceScope) { scope = next; flushSync(); },
    finishScope() {
      model.applyState(model.readScope(scope));
      loadedScopeId = listPreferenceScopeId(scope);
      flushSync();
    },
    ready(value: boolean) { ready = value; flushSync(); },
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.restoreAllMocks();
});

describe('list column preferences', () => {
  it('restores resource defaults and persists them within the current scope', () => {
    const { model } = setup();
    expect(model.captureState()).toEqual({ columnVisibility: { hidden: false }, columnOrder: [] });
    expect(localStorage.getItem(columnVisibilityStorageKey(scopeA))).toBe('{"hidden":false}');
    expect(localStorage.getItem(columnOrderStorageKey(scopeA))).toBe('[]');
    expect(localStorage.getItem(columnOrderStorageKey(scopeB))).toBeNull();
  });

  it('filters unknown columns, invalid visibility values and duplicate order entries', () => {
    localStorage.setItem(columnVisibilityStorageKey(scopeA), '{"email":false,"id":true,"unknown":false,"hidden":"false","_select":false}');
    localStorage.setItem(columnOrderStorageKey(scopeA), '["email","unknown","email",42,"id","_actions"]');
    const { model } = setup();
    expect(model.captureState()).toEqual({
      columnVisibility: { email: false, id: true, _select: false },
      columnOrder: ['email', 'id', '_actions'],
    });
  });

  it.each(['{', 'null', '[]', '"bad"', '42'])('falls back for invalid stored visibility: %s', value => {
    localStorage.setItem(columnVisibilityStorageKey(scopeA), value);
    localStorage.setItem(columnOrderStorageKey(scopeA), value);
    const { model } = setup();
    expect(model.captureState()).toEqual({ columnVisibility: { hidden: false }, columnOrder: [] });
  });

  it('respects an explicitly empty stored visibility object', () => {
    localStorage.setItem(columnVisibilityStorageKey(scopeA), '{}');
    const { model } = setup();
    expect(model.visibility.current).toEqual({});
  });

  it('prioritizes a saved view and falls back to stored order only when its order is empty', () => {
    localStorage.setItem(columnOrderStorageKey(scopeA), '["email","id"]');
    const first = setup({ initialViewState: { columnVisibility: {}, columnOrder: [] } });
    expect(first.model.captureState()).toEqual({ columnVisibility: {}, columnOrder: ['email', 'id'] });
    const second = setup({ initialViewState: { columnVisibility: { id: false }, columnOrder: ['id'] } });
    expect(second.model.captureState()).toEqual({ columnVisibility: { id: false }, columnOrder: ['id'] });
  });

  it('marks user changes dirty, while restored state remains clean', () => {
    const { model, onDirty } = setup();
    model.setVisibility('email', false);
    model.setOrder([{ id: 'email' }, { id: 'id' }]);
    flushSync();
    expect(onDirty).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(columnOrderStorageKey(scopeA))).toBe('["email","id"]');
    model.applyState({ columnVisibility: {}, columnOrder: [] });
    flushSync();
    expect(onDirty).toHaveBeenCalledTimes(2);
    expect(model.captureState()).toEqual({ columnVisibility: {}, columnOrder: [] });
  });

  it('does not overwrite the new tenant before its preferences have loaded', () => {
    localStorage.setItem(columnVisibilityStorageKey(scopeA), '{"email":false}');
    localStorage.setItem(columnOrderStorageKey(scopeA), '["email","id"]');
    localStorage.setItem(columnVisibilityStorageKey(scopeB), '{"id":false}');
    localStorage.setItem(columnOrderStorageKey(scopeB), '["id","email"]');
    const { model, beginScope, finishScope } = setup();
    beginScope(scopeB);
    expect(localStorage.getItem(columnVisibilityStorageKey(scopeB))).toBe('{"id":false}');
    expect(localStorage.getItem(columnOrderStorageKey(scopeB))).toBe('["id","email"]');
    expect(model.visibility.current).toEqual({ email: false });
    finishScope();
    expect(model.captureState()).toEqual({ columnVisibility: { id: false }, columnOrder: ['id', 'email'] });
    expect(localStorage.getItem(columnVisibilityStorageKey(scopeA))).toBe('{"email":false}');
    expect(localStorage.getItem(columnOrderStorageKey(scopeA))).toBe('["email","id"]');
  });

  it('gates both immediate and reactive persistence on identity readiness', () => {
    const { model, ready } = setup();
    ready(false);
    const setItem = vi.spyOn(localStorage, 'setItem');
    model.applyState({ columnVisibility: { email: false }, columnOrder: ['email'] });
    flushSync();
    expect(setItem).not.toHaveBeenCalled();
    ready(true);
    expect(localStorage.getItem(columnVisibilityStorageKey(scopeA))).toBe('{"email":false}');
    expect(localStorage.getItem(columnOrderStorageKey(scopeA))).toBe('["email"]');
  });

  it('keeps in-memory changes usable when persistence throws', () => {
    const { model } = setup();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => {
      model.setVisibility('email', false);
      model.setOrder([{ id: 'email' }]);
      flushSync();
      model.applyState({ columnVisibility: { id: false }, columnOrder: ['id'] });
      flushSync();
    }).not.toThrow();
    expect(model.captureState()).toEqual({ columnVisibility: { id: false }, columnOrder: ['id'] });
  });

  it('returns detached state for saving a view', () => {
    const { model } = setup();
    const snapshot = model.captureState();
    snapshot.columnVisibility.hidden = true;
    snapshot.columnOrder.push('email');
    expect(model.captureState()).toEqual({ columnVisibility: { hidden: false }, columnOrder: [] });
  });
});
