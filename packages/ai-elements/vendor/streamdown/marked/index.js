import { Lexer } from 'marked';
import { markedAlert } from './marked-alert.js';
import { markedFootnote } from './marked-footnotes.js';
import { markedMath } from './marked-math.js';
import { markedSub, markedSup } from './marked-subsup.js';
import { markedList } from './marked-list.js';
import { markedBr } from './marked-br.js';
import { markedHr } from './marked-hr.js';
import { markedTable } from './marked-table.js';
import { markedDl } from './marked-dl.js';
import { markedAlign } from './marked-align.js';
import { markedCitations } from './marked-citations.js';
import { markedMdx } from './marked-mdx.js';
import { markedCjk } from './marked-cjk.js';
const footnoteReferencePattern = /\[\^[\w-]{1,200}\](?!:)/;
const footnoteDefinitionPattern = /\[\^[\w-]{1,200}\]:/;
const openingTagPattern = /<(\w+)[\s>]/;
const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
]);
const openTagPatternCache = new Map();
const closeTagPatternCache = new Map();
const getOpenTagPattern = (tagName) => {
    const normalizedTag = tagName.toLowerCase();
    const cached = openTagPatternCache.get(normalizedTag);
    if (cached) {
        return cached;
    }
    const pattern = new RegExp(`<${normalizedTag}(?=[\\s>/])[^>]*>`, 'gi');
    openTagPatternCache.set(normalizedTag, pattern);
    return pattern;
};
const getCloseTagPattern = (tagName) => {
    const normalizedTag = tagName.toLowerCase();
    const cached = closeTagPatternCache.get(normalizedTag);
    if (cached) {
        return cached;
    }
    const pattern = new RegExp(`</${normalizedTag}(?=[\\s>])[^>]*>`, 'gi');
    closeTagPatternCache.set(normalizedTag, pattern);
    return pattern;
};
const countNonSelfClosingOpenTags = (block, tagName) => {
    if (voidElements.has(tagName.toLowerCase())) {
        return 0;
    }
    const matches = block.match(getOpenTagPattern(tagName));
    if (!matches) {
        return 0;
    }
    let count = 0;
    for (const match of matches) {
        if (!match.trimEnd().endsWith('/>')) {
            count += 1;
        }
    }
    return count;
};
const countClosingTags = (block, tagName) => {
    const matches = block.match(getCloseTagPattern(tagName));
    return matches ? matches.length : 0;
};
const countDoubleDollars = (value) => {
    let count = 0;
    for (let i = 0; i < value.length - 1; i += 1) {
        if (value[i] === '$' && value[i + 1] === '$') {
            count += 1;
            i += 1;
        }
    }
    return count;
};
const parseExtensions = (...extensions) => {
    const options = {
        gfm: true,
        extensions: {
            block: [],
            inline: [],
            childTokens: {},
            renderers: {},
            startBlock: [],
            startInline: []
        }
    };
    extensions.forEach(({ level, name, tokenizer, ...rest }) => {
        if ('start' in rest && rest.start) {
            if (level === 'block') {
                options.extensions.startBlock.push(rest.start);
            }
            else {
                options.extensions.startInline.push(rest.start);
            }
        }
        if (tokenizer) {
            if (level === 'block') {
                options.extensions.block.push(tokenizer);
            }
            else {
                options.extensions.inline.push(tokenizer);
            }
        }
    });
    return options;
};
const cloneFootnoteState = (state) => ({
    refs: new Map(state?.refs ?? []),
    footnotes: new Map(state?.footnotes ?? [])
});
const filterOutFootnoteExtensions = (extensions) => extensions.filter(({ name }) => name !== 'footnote' && name !== 'footnoteRef');
const buildInlineLexerOptions = (extensions, includeFootnotes) => {
    const resolvedExtensions = includeFootnotes ? extensions : filterOutFootnoteExtensions(extensions);
    const hasCustomMathExtension = resolvedExtensions.some(({ name }) => name === 'math');
    return parseExtensions(markedHr, markedTable, ...(includeFootnotes ? markedFootnote({ preferContext: false }) : []), markedAlert, ...(hasCustomMathExtension ? [] : markedMath), ...markedCjk, markedSub, markedSup, markedList, markedBr, markedDl, markedAlign, markedCitations, markedMdx, ...resolvedExtensions);
};
const buildBlockLexerOptions = (extensions, includeFootnotes) => parseExtensions(markedHr, ...(includeFootnotes ? markedFootnote({ preferContext: false }) : []), markedDl, markedTable, markedAlign, markedMdx, ...(includeFootnotes ? extensions : filterOutFootnoteExtensions(extensions)).filter(({ level, applyInBlockParsing }) => level === 'block' && applyInBlockParsing));
const defaultBlockLexerOptionsWithoutFootnotes = { gfm: true };
const mergeBlockTokens = (rawBlocks) => {
    const mergedBlocks = [];
    const htmlStack = [];
    let previousTokenWasCode = false;
    for (const block of rawBlocks) {
        const currentBlock = block.raw;
        const mergedBlocksLen = mergedBlocks.length;
        if (htmlStack.length > 0) {
            mergedBlocks[mergedBlocksLen - 1] += currentBlock;
            const trackedTag = htmlStack[htmlStack.length - 1];
            const newOpenTags = countNonSelfClosingOpenTags(currentBlock, trackedTag);
            const newCloseTags = countClosingTags(currentBlock, trackedTag);
            for (let index = 0; index < newOpenTags; index += 1) {
                htmlStack.push(trackedTag);
            }
            for (let index = 0; index < newCloseTags; index += 1) {
                if (htmlStack.length > 0 && htmlStack[htmlStack.length - 1] === trackedTag) {
                    htmlStack.pop();
                }
            }
            continue;
        }
        if (block.type === 'html' && block.block) {
            const openingTagMatch = currentBlock.match(openingTagPattern);
            if (openingTagMatch) {
                const tagName = openingTagMatch[1];
                const openTags = countNonSelfClosingOpenTags(currentBlock, tagName);
                const closeTags = countClosingTags(currentBlock, tagName);
                if (openTags > closeTags) {
                    htmlStack.push(tagName);
                }
            }
        }
        if (mergedBlocksLen > 0 && !previousTokenWasCode) {
            const previousBlock = mergedBlocks[mergedBlocksLen - 1];
            if (countDoubleDollars(previousBlock) % 2 === 1) {
                mergedBlocks[mergedBlocksLen - 1] = previousBlock + currentBlock;
                continue;
            }
        }
        mergedBlocks.push(currentBlock);
        if (block.type !== 'space') {
            previousTokenWasCode = block.type === 'code';
        }
    }
    return mergedBlocks;
};
const parseDefaultBlocksWithoutFootnotes = (markdown) => mergeBlockTokens(Lexer.lex(markdown, defaultBlockLexerOptionsWithoutFootnotes).filter((block) => block.type !== 'space'));
export const lexWithFootnotes = (markdown, extensions = []) => {
    const lexer = new Lexer(buildInlineLexerOptions(extensions, true));
    return {
        tokens: lexer
            .lex(markdown)
            .filter((token) => token.type !== 'space' && token.type !== 'footnote'),
        footnotes: cloneFootnoteState(lexer.footnotes)
    };
};
export const lexWithoutFootnotes = (markdown, extensions = []) => {
    const lexer = new Lexer(buildInlineLexerOptions(extensions, false));
    return lexer
        .lex(markdown)
        .filter((token) => token.type !== 'space' && token.type !== 'footnote');
};
export const lex = (markdown, extensions = []) => {
    return lexWithFootnotes(markdown, extensions).tokens;
};
export const parseBlocksWithFootnotes = (markdown, extensions = []) => {
    if (footnoteReferencePattern.test(markdown) || footnoteDefinitionPattern.test(markdown)) {
        return {
            blocks: [markdown],
            footnotes: lexWithFootnotes(markdown, extensions).footnotes
        };
    }
    if (extensions.length === 0) {
        return {
            blocks: parseDefaultBlocksWithoutFootnotes(markdown),
            footnotes: cloneFootnoteState()
        };
    }
    const blockLexer = new Lexer(buildBlockLexerOptions(extensions, true));
    const rawBlocks = blockLexer
        .blockTokens(markdown, [])
        .filter((block) => block.type !== 'space' && block.type !== 'footnote');
    return {
        blocks: mergeBlockTokens(rawBlocks),
        footnotes: cloneFootnoteState(blockLexer.footnotes)
    };
};
export const parseBlocksWithoutFootnotes = (markdown, extensions = []) => {
    if (extensions.length === 0) {
        return parseDefaultBlocksWithoutFootnotes(markdown);
    }
    const blockLexer = new Lexer(buildBlockLexerOptions(extensions, false));
    const rawBlocks = blockLexer.blockTokens(markdown, []).filter((block) => block.type !== 'space');
    return mergeBlockTokens(rawBlocks);
};
export const parseBlocks = (markdown, extensions = []) => {
    return parseBlocksWithFootnotes(markdown, extensions).blocks;
};
