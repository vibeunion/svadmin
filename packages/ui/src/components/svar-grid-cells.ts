import type { Snippet } from 'svelte';
import type { SvarRecordId } from './svar-grid-operations.js';

export interface SvarCellContent { readonly id: SvarRecordId; readonly field: string; readonly value: unknown; readonly record: Record<string, unknown> }
export interface SvarCellContext {
  readonly render: () => Snippet<[SvarCellContent]> | undefined;
  readonly resolve: (row: unknown, column: unknown) => SvarCellContent | undefined;
}
/** 仅可信宿主可提供原生 snippet；不把引擎 api 或 exec 传给内容组件。 */
export const SVAR_CELL_CONTEXT = Symbol('svadmin.svar.cell');
