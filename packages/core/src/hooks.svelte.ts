// @svadmin/core — Core Data and Hook APIs (Modularized for v0.2.29+)

// ─── Re-exports from modular hook files ─────────────────────────────

export * from './query-hooks.svelte';
export * from './table-hooks.svelte';
export * from './routing-hooks.svelte';
export * from './utility-hooks.svelte';

// ─── Re-export types from options ─────────────────────────────────
export type { InvalidateScope,OvertimeConfig } from './options.svelte';

// ─── Export shared utilities ────────────────────────────────────────

export { createOvertimeTracker,createLiveSubscription } from './hook-utils.svelte';
export type { OvertimeResult,OvertimeOptions,NotificationConfig } from './hook-utils.svelte';

// ─── Additional core hooks ─────────────────────────────────────────

import { captureAdminContext } from './context.svelte';
import { createOvertimeTracker } from './hook-utils.svelte';
import type { OvertimeOptions } from './hook-utils.svelte';
import type { DataProvider } from './types';

// ─── useInfiniteList ────────────────────────────────────────────────

export { useInfiniteList, createInfiniteListQuery } from './infinite-query.svelte';
export type { UseInfiniteListOptions } from './infinite-query.svelte';

// ─── useSelect ──────────────────────────────────────────────────────

export { createSelectQuery } from './select-query.svelte';
export type { UseSelectOptions } from './select-query.svelte';

// ─── useOvertime ────────────────────────────────────────────────────

export function useOvertime(options?: OvertimeOptions) {
  let isLoading=$state(false);
  const overtime=createOvertimeTracker(() => isLoading,options);
  return {
    get elapsedTime() { return overtime.elapsedTime; },
    start() { isLoading=true; },
    stop() { isLoading=false; },
  };
}

/**
 * Refine-compatible alias for query-heavy callers.
 *
 * Accepts a query-like object or a loading getter and reports elapsed time while
 * loading. `useOvertime` keeps the manual start/stop form for custom work.
 */
export function useLoadingOvertime(
  source?: (() => boolean) | { isLoading?: boolean; isPending?: boolean; isFetching?: boolean },
  options?: OvertimeOptions,
) {
  const tracker=createOvertimeTracker(() => typeof source === 'function'
    ? source()
    : source?.isLoading === true || source?.isPending === true || source?.isFetching === true, options);
  return {
    get elapsedTime() { return tracker.elapsedTime; },
    get overtime() { return tracker.elapsedTime; },
  };
}

/** Set `document.title` for the lifetime of the calling component. */
export function useTitle(value: string | (() => string) | undefined, options?: { append?: string }) {
  let previous: string | undefined;
  $effect(() => {
    if (typeof document === 'undefined') return;
    const title = typeof value === 'function' ? value() : value;
    if (title === undefined) return;
    if (previous === undefined) previous = document.title;
    document.title = options?.append === undefined ? title : `${title}${options.append}`;
    return () => {
      if (previous !== undefined) document.title = previous;
    };
  });
}

// ─── useDataProvider ────────────────────────────────────────────────

export function useDataProvider(): (dataProviderName?: string) => DataProvider {
  const adminContext=captureAdminContext();
  return (name?: string) => adminContext.getDataProvider(name);
}

// ─── useThemedLayoutContext ─────────────────────────────────────────

let _sidebarCollapsed=$state(false);

export function resetSidebarCollapsed() { _sidebarCollapsed=false; }

export function useThemedLayoutContext() {
  return {
    get sidebarCollapsed() { return _sidebarCollapsed; },
    setSidebarCollapsed(v: boolean) { _sidebarCollapsed=v; },
    toggleSidebar() { _sidebarCollapsed=!_sidebarCollapsed; },
  };
}
