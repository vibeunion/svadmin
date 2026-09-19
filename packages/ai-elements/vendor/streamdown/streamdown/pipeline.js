import { filterMarkdownTokens } from '../markdown.js';
import { carets, hasIncompleteCodeFence, hasTable } from '../streaming.js';
import { detectTextDirection } from '../utils/detectDirection.js';
import { normalizeHtmlIndentation } from '../security/html.js';
import { preprocessCustomTags } from '../security/preprocess-custom-tags.js';
import { preprocessLiteralTagContent } from '../security/preprocess-literal-tag-content.js';
import { repairIncompleteMarkdown } from './incomplete-markdown.js';
import { footnoteDefinitionPattern, resolveRootClassName } from './config.js';
export const preprocessStreamdownContent = ({ content, shouldNormalizeHtmlIndentation, literalTagContent, allowedTagNames }) => {
    let result = shouldNormalizeHtmlIndentation ? normalizeHtmlIndentation(content) : content;
    if (literalTagContent && literalTagContent.length > 0) {
        result = preprocessLiteralTagContent(result, literalTagContent);
    }
    if (allowedTagNames.length > 0) {
        result = preprocessCustomTags(result, allowedTagNames);
    }
    return result;
};
export const preserveStreamingFootnoteLiterals = ({ tokens, mode, isAnimating }) => tokens.map((token) => {
    if (mode === 'streaming' &&
        token.type === 'footnoteRef') {
        return {
            type: 'text',
            raw: token.raw,
            text: token.raw
        };
    }
    if ('tokens' in token && Array.isArray(token.tokens)) {
        return {
            ...token,
            tokens: preserveStreamingFootnoteLiterals({
                tokens: token.tokens,
                mode,
                isAnimating
            })
        };
    }
    return token;
});
export const shouldResolveFootnotes = ({ markdown, mode, parseIncompleteMarkdown }) => !(mode === 'streaming' && parseIncompleteMarkdown && !footnoteDefinitionPattern.test(markdown));
export const parseMarkdownWithOptionalFootnotes = ({ markdown, cache, extensions, mode, parseIncompleteMarkdown, remend, cacheScope = 'stable' }) => cache.parseBlock({
    markdown: mode === 'streaming' && parseIncompleteMarkdown
        ? repairIncompleteMarkdown(markdown, remend)
        : markdown,
    extensions,
    resolveFootnotes: shouldResolveFootnotes({
        markdown,
        mode,
        parseIncompleteMarkdown
    }),
    cacheScope
});
export const buildParsedBlocks = ({ resolvedStatic, normalizedContent, parsedMarkdownDocument, rawBlocks, blockIsIncomplete, mode, isAnimating, parseMarkdownWithFootnotes }) => {
    if (resolvedStatic && parsedMarkdownDocument.staticBlock) {
        return [
            {
                raw: normalizedContent,
                tokens: preserveStreamingFootnoteLiterals({
                    tokens: parsedMarkdownDocument.staticBlock.tokens,
                    mode,
                    isAnimating
                }),
                footnotes: parsedMarkdownDocument.staticBlock.footnotes,
                isIncomplete: blockIsIncomplete[0] ?? false
            }
        ];
    }
    return rawBlocks.map((raw, index) => {
        const isIncomplete = blockIsIncomplete[index] ?? false;
        const parsed = parseMarkdownWithFootnotes(raw, isIncomplete ? 'transient' : 'stable');
        return {
            raw,
            tokens: preserveStreamingFootnoteLiterals({
                tokens: parsed.tokens,
                mode,
                isAnimating
            }),
            footnotes: parsed.footnotes,
            isIncomplete
        };
    });
};
export const mergeFootnoteState = ({ documentFootnotes, parsedBlocks }) => {
    const refs = new Map(documentFootnotes.refs);
    const footnotes = new Map(documentFootnotes.footnotes);
    for (const parsedBlock of parsedBlocks) {
        for (const [label, ref] of parsedBlock.footnotes.refs) {
            refs.set(label, ref);
        }
        for (const [label, entry] of parsedBlock.footnotes.footnotes) {
            footnotes.set(label, entry);
        }
    }
    return {
        refs,
        footnotes
    };
};
export const buildFootnoteEntries = ({ footnoteState, parseMarkdownWithFootnotes, filtering }) => Array.from(footnoteState.footnotes.values()).map((entry) => {
    const content = entry.lines.join('\n').trim();
    return {
        ...entry,
        lines: [...entry.lines],
        tokens: content.length === 0
            ? []
            : filterMarkdownTokens(parseMarkdownWithFootnotes(content).tokens, filtering)
    };
});
export const resolveCaretPresentation = ({ caret, className, futureClassName, prefix, rawBlocks, shouldShowCaret }) => {
    const shouldHideCaret = !shouldShowCaret || rawBlocks.length === 0
        ? false
        : (() => {
            const lastBlock = rawBlocks.at(-1);
            return hasIncompleteCodeFence(lastBlock) || hasTable(lastBlock);
        })();
    return {
        shouldHideCaret,
        rootStyle: shouldShowCaret && !shouldHideCaret && caret
            ? `--streamdown-caret: "${carets[caret]}";`
            : undefined,
        rootClassName: resolveRootClassName({
            className,
            futureClassName,
            prefix,
            shouldShowCaret,
            shouldHideCaret
        })
    };
};
export const resolveBlockDirection = ({ block, dir }) => {
    if (!dir) {
        return undefined;
    }
    if (dir === 'auto') {
        return detectTextDirection(block);
    }
    return dir;
};
