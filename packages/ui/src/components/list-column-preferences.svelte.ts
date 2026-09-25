import { untrack } from 'svelte';
import { createAtom, useSelector } from '@tanstack/svelte-store';
import type { ColumnVisibilityState } from '@tanstack/svelte-table';
import type { FieldDefinition } from '@svadmin/core';
import { decodeBaseRecord } from '@svadmin/core/schema';
import {
  columnOrderStorageKey,
  columnVisibilityStorageKey,
  legacyColumnOrderStorageKey,
  legacyColumnVisibilityStorageKey,
  type ListPreferenceScope,
  type SavedListViewState,
} from './saved-list-views.js';

type ColumnPreferences = Pick<SavedListViewState, 'columnVisibility' | 'columnOrder'>;

interface ListColumnPreferencesOptions {
  scope: () => ListPreferenceScope;
  columns: () => Set<string>;
  fields: () => FieldDefinition[];
  isScopeLoaded: () => boolean;
  readPreference: (scope: ListPreferenceScope, key: string, legacyKey: string) => string | null;
  initialViewState: ColumnPreferences | undefined;
  onDirty: () => void;
}

export function createListColumnPreferences(options: ListColumnPreferencesOptions) {
  const visibilityAtom = createAtom<ColumnVisibilityState>(untrack(() => (
    options.initialViewState?.columnVisibility ?? readVisibility(options.scope())
  )));
  const orderAtom = createAtom<string[]>(untrack(() => (
    options.initialViewState?.columnOrder.length
      ? options.initialViewState.columnOrder : readOrder(options.scope())
  )));
  const visibility = useSelector(visibilityAtom);
  const order = useSelector(orderAtom);

  function readVisibility(scope: ListPreferenceScope): ColumnVisibilityState {
    const stored = options.readPreference(scope, columnVisibilityStorageKey(scope), legacyColumnVisibilityStorageKey(scope.resourceName));
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const visibility: ColumnVisibilityState = {};
          for (const [columnId, visible] of Object.entries(decodeBaseRecord(parsed))) {
            if (options.columns().has(columnId) && typeof visible === 'boolean') visibility[columnId] = visible;
          }
          return visibility;
        }
      } catch { /* fall through to resource defaults */ }
    }
    const visibility: ColumnVisibilityState = {};
    for (const field of options.fields()) {
      if (field.showInList === false) visibility[field.key] = false;
    }
    return visibility;
  }

  function readOrder(scope: ListPreferenceScope): string[] {
    const stored = options.readPreference(scope, columnOrderStorageKey(scope), legacyColumnOrderStorageKey(scope.resourceName));
    if (!stored) return [];
    try {
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((columnId: unknown): columnId is string => (
          typeof columnId === 'string' && options.columns().has(columnId)
        )))]
        : [];
    } catch {
      return [];
    }
  }

  function persistOrder(ids: string[]): void {
    if (typeof window === 'undefined' || !options.isScopeLoaded()) return;
    try {
      localStorage.setItem(columnOrderStorageKey(options.scope()), JSON.stringify(ids));
    } catch { /* keep in-memory preferences when storage is unavailable */ }
  }

  $effect(() => {
    if (!options.isScopeLoaded()) return;
    const storageKey = columnVisibilityStorageKey(options.scope());
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(visibility.current));
      } catch { /* keep in-memory preferences when storage is unavailable */ }
    }
  });
  $effect(() => {
    if (!options.isScopeLoaded()) return;
    persistOrder(order.current);
  });

  function readScope(scope: ListPreferenceScope): ColumnPreferences {
    return { columnVisibility: readVisibility(scope), columnOrder: readOrder(scope) };
  }

  function captureState(): ColumnPreferences {
    return { columnVisibility: { ...visibility.current }, columnOrder: [...order.current] };
  }

  function applyState(state: ColumnPreferences): void {
    visibilityAtom.set(state.columnVisibility);
    orderAtom.set(state.columnOrder);
    persistOrder(state.columnOrder);
  }

  function setVisibility(columnId: string, visible: boolean): void {
    options.onDirty();
    visibilityAtom.set({ ...visibility.current, [columnId]: visible });
  }

  function setOrder(columns: Array<{ id: string }>): void {
    options.onDirty();
    orderAtom.set(columns.map(column => column.id));
  }

  return { visibility, order, readScope, captureState, applyState, setVisibility, setOrder };
}
