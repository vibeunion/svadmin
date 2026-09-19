export interface TableData {
    headers: string[];
    rows: string[][];
}
export declare const extractTableDataFromElement: (tableElement: ParentNode) => TableData;
export declare const tableDataToCSV: ({ headers, rows }: TableData) => string;
export declare const tableDataToTSV: ({ headers, rows }: TableData) => string;
export declare const tableDataToMarkdown: ({ headers, rows }: TableData) => string;
