import { Lexer } from 'marked';
const variants = ['note', 'tip', 'important', 'warning', 'caution'];
export function createSyntaxPattern(type) {
    return `^\\s*[\\*_]*\\[!${type.toUpperCase()}\\][\\*_]*\\s*`;
}
const defaultLexer = new Lexer({ gfm: true });
const defaultTokenizer = defaultLexer.options.tokenizer;
export const markedAlert = {
    name: 'alert',
    level: 'block',
    tokenizer(src) {
        const cap = defaultTokenizer.rules.block.blockquote.exec(src);
        if (cap) {
            const blockquoteToken = defaultTokenizer.blockquote(src);
            blockquoteToken && processAlertToken(blockquoteToken, this.lexer.options.tokenizer);
            return blockquoteToken;
        }
    }
};
export function processAlertToken(token, tokenizer) {
    const matchedVariant = variants.find((type) => new RegExp(createSyntaxPattern(type), 'i').test(('text' in token && token.text) || ''));
    if (!matchedVariant) {
        Object.assign(token, {
            tokens: token.tokens
                .map((token) => {
                return tokenizer.lexer.blockTokens(token.raw, [])[0];
            })
                .filter(Boolean)
        });
        return;
    }
    const alertPattern = new RegExp(`[\\*_]*\\[!${matchedVariant.toUpperCase()}\\][\\*_]*`, 'g');
    const tokens = token.tokens
        .map((token) => {
        let cleanedRaw = token.raw;
        // Remove alert markers with any markdown formatting (asterisks/underscores)
        cleanedRaw = cleanedRaw.replaceAll(alertPattern, '').trim();
        return tokenizer.lexer.blockTokens(cleanedRaw, [])[0];
    })
        .filter(Boolean);
    Object.assign(token, {
        type: 'alert',
        variant: matchedVariant,
        tokens,
        text: token.text.replace(alertPattern, '').trim()
    });
}
