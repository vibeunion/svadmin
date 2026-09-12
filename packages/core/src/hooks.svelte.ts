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
import { decodeBaseRecord } from './record-decoder';
import { createSelectQuery, type UseSelectOptions } from './select-query.svelte';

// ─── useInfiniteList ────────────────────────────────────────────────

export { useInfiniteList, createInfiniteListQuery } from './infinite-query.svelte';
export type { UseInfiniteListOptions } from './infinite-query.svelte';

// ─── useSelect ──────────────────────────────────────────────────────

export { createSelectQuery } from './select-query.svelte';
export type { UseSelectOptions } from './select-query.svelte';

export function useSelect(options: UseSelectOptions) {
  return createSelectQuery(options, () => decodeBaseRecord);
}
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
