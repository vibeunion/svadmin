import { lexWithFootnotes, lexWithoutFootnotes, parseBlocksWithFootnotes, parseBlocksWithoutFootnotes } from './marked/index.js';
const defaultMarkdownParseOperations = {
    lexWithFootnotes,
    lexWithoutFootnotes,
    parseBlocksWithFootnotes,
    parseBlocksWithoutFootnotes
};
const createEmptyFootnoteState = () => ({
    refs: new Map(),
    footnotes: new Map()
});
class ScopedMarkdownParseCache {
    operations;
    extensions;
    blockParsesWithFootnotes = new Map();
    blockParsesWithoutFootnotes = new Map();
    lastDocumentParse = null;
    constructor(operations, extensions) {
        this.operations = operations;
        this.extensions = extensions;
    }
    computeBlockParse(markdown, resolveFootnotes) {
        return resolveFootnotes
            ? this.operations.lexWithFootnotes(markdown, this.extensions)
            : {
                tokens: this.operations.lexWithoutFootnotes(markdown, this.extensions),
                footnotes: createEmptyFootnoteState()
            };
    }
    parseBlock({ markdown, resolveFootnotes, cacheScope = 'stable' }) {
        if (cacheScope === 'transient') {
            return this.computeBlockParse(markdown, resolveFootnotes);
        }
        const cache = resolveFootnotes
            ? this.blockParsesWithFootnotes
            : this.blockParsesWithoutFootnotes;
        const cached = cache.get(markdown);
        if (cached) {
            return cached;
        }
        const result = this.computeBlockParse(markdown, resolveFootnotes);
        cache.set(markdown, result);
        return result;
    }
    parseDocument({ markdown, resolveFootnotes, splitBlocksFn = null, blockCacheScope = 'stable' }) {
        if (this.lastDocumentParse?.markdown === markdown &&
            this.lastDocumentParse.resolveFootnotes === resolveFootnotes &&
            this.lastDocumentParse.splitBlocksFn === splitBlocksFn) {
            return this.lastDocumentParse.result;
        }
        let result;
        if (splitBlocksFn) {
            result = {
                blocks: splitBlocksFn(markdown),
                footnotes: resolveFootnotes
                    ? this.parseBlock({
                        markdown,
                        resolveFootnotes,
                        cacheScope: blockCacheScope
                    }).footnotes
                    : createEmptyFootnoteState()
            };
        }
        else if (resolveFootnotes) {
            result = this.operations.parseBlocksWithFootnotes(markdown, this.extensions);
        }
        else {
            result = {
                blocks: this.operations.parseBlocksWithoutFootnotes(markdown, this.extensions),
                footnotes: createEmptyFootnoteState()
            };
        }
        this.lastDocumentParse = {
            markdown,
            resolveFootnotes,
            splitBlocksFn,
            result
        };
        return result;
    }
}
class MarkdownParseCache {
    operations;
    cachesByExtensions = new WeakMap();
    cacheWithoutExtensions;
    constructor(operations) {
        this.operations = operations;
        this.cacheWithoutExtensions = new ScopedMarkdownParseCache(operations, []);
    }
    parseBlock(request) {
        return this.getScopedCache(request.extensions).parseBlock(request);
    }
    parseDocument(request) {
        return this.getScopedCache(request.extensions).parseDocument(request);
    }
    getScopedCache(extensions = []) {
        if (extensions.length === 0) {
            return this.cacheWithoutExtensions;
        }
        const cached = this.cachesByExtensions.get(extensions);
        if (cached) {
            return cached;
        }
        const scopedCache = new ScopedMarkdownParseCache(this.operations, extensions);
        this.cachesByExtensions.set(extensions, scopedCache);
        return scopedCache;
    }
}
export const createMarkdownParseCache = (operations = defaultMarkdownParseOperations) => new MarkdownParseCache(operations);
