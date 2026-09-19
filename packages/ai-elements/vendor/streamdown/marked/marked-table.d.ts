import type { Extension } from './index.js';
export interface SpanTableOptions {
    useTheadTbody?: boolean;
    useTfoot?: boolean;
    detectFooter?: boolean;
    maxColspan?: number | null;
    handleComplexSpans?: boolean;
}
interface BaseCell {
    rowspan: number;
    colspan: number;
    text: string;
    position?: number;
    tokens?: unknown[];
    rowSpanTarget?: BaseCell;
    complexRowSpan?: boolean;
    relatedCell?: BaseCell;
    align?: string | null;
}
export interface TH extends BaseCell {
    type: 'th';
}
export interface TD extends BaseCell {
    type: 'td';
}
export type RowColumnNormalizationMode = 'exact' | 'underflow-preserved' | 'overflow-preserved' | 'partial-fit-preserved' | 'complex-span-preserved';
export interface RowColumnNormalization {
    mode: RowColumnNormalizationMode;
    expectedColumns: number | null;
    actualColumns: number;
}
export interface TableColumnNormalization {
    mode: 'balanced' | 'preserve-content';
    issues: Exclude<RowColumnNormalizationMode, 'exact'>[];
}
export interface THeadRow {
    type: 'tr';
    tokens: TH[];
    columnNormalization?: RowColumnNormalization;
    placeholderColumns?: number;
}
export interface TRow {
    type: 'tr';
    tokens: TD[];
    columnNormalization?: RowColumnNormalization;
    placeholderColumns?: number;
}
export interface THead {
    type: 'thead';
    tokens: THeadRow[];
}
export interface TBody {
    type: 'tbody';
    tokens: TRow[];
}
export interface TFoot {
    type: 'tfoot';
    tokens: TRow[];
}
export type TableSection = THead | TBody | TFoot;
export interface TableToken {
    type: 'table';
    tokens: TableSection[];
    raw: string;
    align: (string | null)[];
    columnNormalization?: TableColumnNormalization;
}
interface WorkingCell extends BaseCell {
}
type WorkingRow = WorkingCell[];
interface WorkingRowData {
    cells: WorkingRow;
    columnNormalization: RowColumnNormalization;
    placeholderColumns?: number;
}
export declare const DEFAULT_OPTIONS: Required<SpanTableOptions>;
export declare const getTableCell: (text: string, cell: BaseCell, type: "th" | "td", align: string | null) => string;
export declare const splitCells: (tableRow: string, count: number | null, prevRow?: WorkingRowData | null, maxColspan?: number | null, preserveIncompleteTail?: boolean) => WorkingRowData;
export declare const markedTable: Extension;
export {};
