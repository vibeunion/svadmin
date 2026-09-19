import {} from './index.js';
import { StreamdownContext } from '../context.svelte.js';
import { getContext } from 'svelte';
import { STREAMDOWN_CONTEXT_KEY } from '../context-key.js';
const footnoteRegex = /^\[\^([^\]\n]+)\]:(?:[ \t]+|\n|$)([^\n]*(?:\n(?:[ \t]+[^\n]*)?)*)/;
const footnoteRefRegex = /^\[\^([^\]\n]+)\](?!\()/;
const footNoteLastLineRegex = /^[ \t]*?[>\-*][ ]|[`]{3,}$|^[ \t]*?[|].+[|]$/;
const safeGetContext = () => {
    try {
        return getContext(STREAMDOWN_CONTEXT_KEY);
    }
    catch (e) {
        return null;
    }
};
export function markedFootnote({ preferContext = true } = {}) {
    const ensureMaps = (tokenizer) => {
        const streamdown = preferContext ? safeGetContext() : null;
        if (!streamdown) {
            if (!tokenizer.lexer.hasFootnotes) {
                tokenizer.lexer.footnotes = {
                    refs: new Map(),
                    footnotes: new Map()
                };
                tokenizer.lexer.hasFootnotes = true;
            }
            return tokenizer.lexer.footnotes;
        }
        else {
            return streamdown.footnotes;
        }
    };
    return [
        {
            name: 'footnote',
            level: 'block',
            tokenizer(src) {
                const maps = ensureMaps(this);
                const match = footnoteRegex.exec(src);
                if (match) {
                    const [raw, label, text = ''] = match;
                    let content = text.split('\n').reduce((acc, curr) => {
                        return acc + '\n' + curr.replace(/^[ \t]+/, '');
                    }, '');
                    const contentLastLine = content.trimEnd().split('\n').pop();
                    content +=
                        // add lines after list, blockquote, codefence, and table
                        contentLastLine && footNoteLastLineRegex.test(contentLastLine) ? '\n\n' : '';
                    const lines = content.split('\n');
                    const token = {
                        type: 'footnote',
                        raw,
                        label,
                        lines,
                        tokens: []
                    };
                    maps.footnotes.set(label, token);
                    const ref = maps.refs.get(label);
                    if (ref) {
                        ref.content = token;
                    }
                    return token;
                }
            }
        },
        {
            name: 'footnoteRef',
            level: 'inline',
            tokenizer(src) {
                const streamdown = preferContext ? safeGetContext() : null;
                const maps = ensureMaps(this);
                const match = footnoteRefRegex.exec(src);
                if (match) {
                    const [raw, label] = match;
                    const footnote = maps.footnotes.get(label);
                    const hasResolvedStreamingContent = Boolean(footnote?.lines.join('\n').trim().length);
                    if (label === 'streamdown:footnote' ||
                        (streamdown?.mode === 'streaming' &&
                            streamdown.isAnimating &&
                            (!footnote || !hasResolvedStreamingContent))) {
                        return;
                    }
                    const token = {
                        type: 'footnoteRef',
                        raw,
                        label,
                        content: footnote || {
                            type: 'footnote',
                            raw,
                            label,
                            lines: [],
                            tokens: []
                        }
                    };
                    maps.refs.set(label, token);
                    return token;
                }
            }
        }
    ];
}
