import type { MarkdownBlockCacheScope, MarkdownBlockParseResult } from '../markdown-parse-cache.js';
import type { RemendOptions } from '@streamdown-svelte/remend';
import type { Footnote, FootnoteRef } from '../marked/marked-footnotes.js';
import type { Extension, FootnoteState, StreamdownToken } from '../marked/index.js';
import { type MarkdownFilteringOptions } from '../markdown.js';
import { carets } from '../streaming.js';
export type ParsedBlock = {
    raw: string;
    tokens: StreamdownToken[];
    footnotes: FootnoteState;
    isIncomplete: boolean;
};
export declare const preprocessStreamdownContent: ({ content, shouldNormalizeHtmlIndentation, literalTagContent, allowedTagNames }: {
    content: string;
    shouldNormalizeHtmlIndentation: boolean;
    literalTagContent?: string[];
    allowedTagNames: string[];
}) => string;
export declare const preserveStreamingFootnoteLiterals: ({ tokens, mode, isAnimating }: {
    tokens: StreamdownToken[];
    mode: "static" | "streaming";
    isAnimating: boolean;
}) => StreamdownToken[];
export declare const shouldResolveFootnotes: ({ markdown, mode, parseIncompleteMarkdown }: {
    markdown: string;
    mode: "static" | "streaming";
    parseIncompleteMarkdown: boolean;
}) => boolean;
export declare const parseMarkdownWithOptionalFootnotes: ({ markdown, cache, extensions, mode, parseIncompleteMarkdown, remend, cacheScope }: {
    markdown: string;
    cache: {
        parseBlock: (request: {
            markdown: string;
            extensions?: Extension[];
            resolveFootnotes: boolean;
            cacheScope?: MarkdownBlockCacheScope;
        }) => MarkdownBlockParseResult;
    };
    extensions: Extension[] | undefined;
    mode: "static" | "streaming";
    parseIncompleteMarkdown: boolean;
    remend?: RemendOptions;
    cacheScope?: MarkdownBlockCacheScope;
}) => MarkdownBlockParseResult;
export declare const buildParsedBlocks: ({ resolvedStatic, normalizedContent, parsedMarkdownDocument, rawBlocks, blockIsIncomplete, mode, isAnimating, parseMarkdownWithFootnotes }: {
    resolvedStatic: boolean;
    normalizedContent: string;
    parsedMarkdownDocument: {
        staticBlock: MarkdownBlockParseResult | null;
    };
    rawBlocks: string[];
    blockIsIncomplete: boolean[];
    mode: "static" | "streaming";
    isAnimating: boolean;
    parseMarkdownWithFootnotes: (markdown: string, cacheScope?: MarkdownBlockCacheScope) => MarkdownBlockParseResult;
}) => {
    raw: string;
    tokens: StreamdownToken[];
    footnotes: FootnoteState;
    isIncomplete: boolean;
}[];
export declare const mergeFootnoteState: ({ documentFootnotes, parsedBlocks }: {
    documentFootnotes: FootnoteState;
    parsedBlocks: ParsedBlock[];
}) => {
    refs: Map<string, FootnoteRef>;
    footnotes: Map<string, Footnote>;
};
export declare const buildFootnoteEntries: ({ footnoteState, parseMarkdownWithFootnotes, filtering }: {
    footnoteState: FootnoteState;
    parseMarkdownWithFootnotes: (markdown: string) => MarkdownBlockParseResult;
    filtering: MarkdownFilteringOptions;
}) => {
    lines: string[];
    tokens: StreamdownToken[];
    type: "footnote";
    raw: string;
    label: string;
}[];
export declare const resolveCaretPresentation: ({ caret, className, futureClassName, prefix, rawBlocks, shouldShowCaret }: {
    caret: keyof typeof carets | undefined;
    className: string | undefined;
    futureClassName: string | undefined;
    prefix: string | undefined;
    rawBlocks: string[];
    shouldShowCaret: boolean;
}) => {
    shouldHideCaret: boolean;
    rootStyle: string | undefined;
    rootClassName: string;
};
export declare const resolveBlockDirection: ({ block, dir }: {
    block: string;
    dir: "auto" | "ltr" | "rtl" | undefined;
}) => "ltr" | "rtl" | undefined;
