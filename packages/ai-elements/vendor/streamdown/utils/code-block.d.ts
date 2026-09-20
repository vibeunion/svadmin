export type ParsedCodeFenceInfo = {
    language: string;
    meta: string;
    startLine?: number;
    showLineNumbers: boolean;
};
export declare function hasIncompleteCodeFence(markdown: string): boolean;
export declare function parseCodeFenceInfo(rawLanguage: string | undefined): ParsedCodeFenceInfo;
