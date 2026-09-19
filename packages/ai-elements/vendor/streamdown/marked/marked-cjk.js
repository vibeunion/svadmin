const CJK_AUTOLINK_BOUNDARY_CHARS = new Set([
    '。',
    '．',
    '，',
    '、',
    '？',
    '！',
    '：',
    '；',
    '（',
    '）',
    '【',
    '】',
    '「',
    '」',
    '『',
    '』',
    '〈',
    '〉',
    '《',
    '》'
]);
const AUTOLINK_PREFIXES = ['https://', 'http://', 'mailto:', 'www.'];
const DELIMITER_CONFIGS = [
    {
        delimiter: '***',
        type: 'em',
        buildText: (content) => `**${content}**`
    },
    {
        delimiter: '**',
        type: 'strong',
        buildText: (content) => content
    },
    {
        delimiter: '~~',
        type: 'del',
        buildText: (content) => content
    },
    {
        delimiter: '*',
        type: 'em',
        buildText: (content) => content
    }
];
function containsCjkBoundaryChar(value) {
    for (const char of value) {
        if (CJK_AUTOLINK_BOUNDARY_CHARS.has(char)) {
            return true;
        }
    }
    return false;
}
function hasNonWhitespaceBoundaryContent(value) {
    return value.length > 0 && value.trim() === value;
}
function findDelimitedMatch(src, delimiter) {
    if (!src.startsWith(delimiter)) {
        return;
    }
    const closingIndex = src.indexOf(delimiter, delimiter.length);
    if (closingIndex === -1) {
        return;
    }
    const content = src.slice(delimiter.length, closingIndex);
    if (!hasNonWhitespaceBoundaryContent(content) || !containsCjkBoundaryChar(content)) {
        return;
    }
    return {
        raw: src.slice(0, closingIndex + delimiter.length),
        content
    };
}
function createInlineTextToken(text) {
    return {
        type: 'text',
        raw: text,
        text,
        escaped: false
    };
}
function createAutolinkHref(text) {
    return text.startsWith('www.') ? `http://${text}` : text;
}
function findAutolinkPrefixIndex(src) {
    const indexes = AUTOLINK_PREFIXES.map((prefix) => {
        const index = src.toLowerCase().indexOf(prefix);
        return index === -1 ? Number.POSITIVE_INFINITY : index;
    });
    const firstIndex = Math.min(...indexes);
    return Number.isFinite(firstIndex) ? firstIndex : undefined;
}
function createAutolinkToken(raw) {
    return {
        type: 'link',
        raw,
        href: createAutolinkHref(raw),
        title: null,
        text: raw,
        tokens: [createInlineTextToken(raw)]
    };
}
function findAutolinkBoundaryMatch(src) {
    const prefix = AUTOLINK_PREFIXES.find((candidate) => src.toLowerCase().startsWith(candidate));
    if (!prefix) {
        return;
    }
    let index = prefix.length;
    let sawBoundary = false;
    while (index < src.length) {
        const char = src[index];
        if (/\s/.test(char)) {
            break;
        }
        if (CJK_AUTOLINK_BOUNDARY_CHARS.has(char)) {
            sawBoundary = true;
            break;
        }
        index += 1;
    }
    if (!sawBoundary || index === prefix.length) {
        return;
    }
    return src.slice(0, index);
}
function createCjkDelimitedExtension(config) {
    return {
        name: `cjk-${config.type}-${config.delimiter.length}`,
        level: 'inline',
        start(src) {
            const firstIndex = src.indexOf(config.delimiter[0]);
            return firstIndex === -1 ? undefined : firstIndex;
        },
        tokenizer(src) {
            const match = findDelimitedMatch(src, config.delimiter);
            if (!match) {
                return;
            }
            const text = config.buildText(match.content);
            return {
                type: config.type,
                raw: match.raw,
                text,
                tokens: this.lexer.inlineTokens(text)
            };
        }
    };
}
export const markedCjk = [
    {
        name: 'cjk-autolink-boundary',
        level: 'inline',
        start(src) {
            return findAutolinkPrefixIndex(src);
        },
        tokenizer(src) {
            const match = findAutolinkBoundaryMatch(src);
            if (!match) {
                return;
            }
            return createAutolinkToken(match);
        }
    },
    ...DELIMITER_CONFIGS.map(createCjkDelimitedExtension)
];
