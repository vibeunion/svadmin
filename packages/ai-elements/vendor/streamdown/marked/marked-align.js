const tokenizeAlignBlock = (src, align, blockTokens) => {
    const openingTag = `[${align}]`;
    const closingTag = `[/${align}]`;
    if (!src.startsWith(openingTag)) {
        return undefined;
    }
    const lines = src.split('\n');
    if (lines[0].trim() !== openingTag) {
        return undefined;
    }
    let contentEndLine = -1;
    let hasClosingTag = false;
    for (let i = 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed === closingTag) {
            contentEndLine = i - 1;
            hasClosingTag = true;
            break;
        }
        if (trimmed === '[center]' || trimmed === '[right]') {
            contentEndLine = i - 1;
            break;
        }
    }
    if (contentEndLine === -1 && !hasClosingTag) {
        return undefined;
    }
    const text = lines.slice(1, contentEndLine + 1).join('\n');
    const raw = lines.slice(0, hasClosingTag ? contentEndLine + 2 : contentEndLine + 1).join('\n');
    return {
        type: 'align',
        align,
        raw,
        text,
        tokens: blockTokens(text, [])
    };
};
export const markedAlign = {
    name: 'align',
    level: 'block',
    tokenizer(src) {
        return (tokenizeAlignBlock(src, 'center', this.lexer.blockTokens.bind(this.lexer)) ??
            tokenizeAlignBlock(src, 'right', this.lexer.blockTokens.bind(this.lexer)));
    }
};
