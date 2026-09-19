import type { Snippet } from 'svelte';
import type { Sort } from '@svadmin/core';

/** 可信宿主的渲染扩展；资源查询、权限、操作和偏好状态仍由 AutoTable 持有。 */
export interface AutoTableGridState {
  readonly records: readonly Record<string, unknown>[];
  readonly columns: readonly { key: string; label: string; width: number; sortable: boolean }[];
  readonly primaryKey: string;
  readonly sorters: readonly Sort[];
  readonly density: 'compact' | 'comfortable';
  readonly locale: string;
  readonly label: string;
  readonly scopeKey: string;
  readonly disabled: boolean;
  readonly onSortChange: (sorters: readonly Sort[]) => void;
  readonly cell: Snippet<[{ id: string | number; field: string }]>;
  readonly controls: Snippet;
  readonly after: Snippet;
}
