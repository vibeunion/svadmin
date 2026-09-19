import { lexWithFootnotes, lexWithoutFootnotes, parseBlocksWithFootnotes, parseBlocksWithoutFootnotes, type Extension, type FootnoteState, type StreamdownToken } from './marked/index.js';
export type MarkdownBlockParseResult = {
    tokens: StreamdownToken[];
    footnotes: FootnoteState;
};
export type MarkdownBlockCacheScope = 'stable' | 'transient';
export type MarkdownDocumentParseResult = {
    blocks: string[];
    footnotes: FootnoteState;
};
export type MarkdownParseOperations = {
    lexWithFootnotes: typeof lexWithFootnotes;
    lexWithoutFootnotes: typeof lexWithoutFootnotes;
    parseBlocksWithFootnotes: typeof parseBlocksWithFootnotes;
    parseBlocksWithoutFootnotes: typeof parseBlocksWithoutFootnotes;
};
type MarkdownBlockParseRequest = {
    markdown: string;
    extensions?: Extension[];
    resolveFootnotes: boolean;
    cacheScope?: MarkdownBlockCacheScope;
};
type MarkdownDocumentParseRequest = MarkdownBlockParseRequest & {
    splitBlocksFn?: ((markdown: string) => string[]) | null;
    blockCacheScope?: MarkdownBlockCacheScope;
};
declare class MarkdownParseCache {
    private readonly operations;
    private readonly cachesByExtensions;
    private readonly cacheWithoutExtensions;
    constructor(operations: MarkdownParseOperations);
    parseBlock(request: MarkdownBlockParseRequest): MarkdownBlockParseResult;
    parseDocument(request: MarkdownDocumentParseRequest): MarkdownDocumentParseResult;
    private getScopedCache;
}
export declare const createMarkdownParseCache: (operations?: MarkdownParseOperations) => MarkdownParseCache;
export {};
