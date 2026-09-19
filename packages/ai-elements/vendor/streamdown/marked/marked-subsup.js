const subRule = /^~([^~\s](?:[^~]*[^~\s])?)~/; // ~text~
const supRule = /^\^([^\^\s](?:[^\^]*[^\^\s])?)\^/; // ^text^
export const markedSub = {
    name: 'sub',
    level: 'inline',
    start(src) {
        const i = src.indexOf('~');
        return i === -1 ? undefined : i;
    },
    tokenizer(src) {
        const match = src.match(subRule);
        if (match) {
            return {
                type: 'sub',
                raw: match[0],
                text: match[1],
                tokens: this.lexer.inlineTokens(match[1])
            };
        }
    }
};
export const markedSup = {
    name: 'sup',
    level: 'inline',
    start(src) {
        const i = src.indexOf('^');
        return i === -1 ? undefined : i;
    },
    tokenizer(src) {
        const match = src.match(supRule);
        if (match) {
            return {
                type: 'sup',
                raw: match[0],
                text: match[1],
                tokens: this.lexer.inlineTokens(match[1])
            };
        }
    }
};
