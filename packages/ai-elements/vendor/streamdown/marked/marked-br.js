export const markedBr = {
    name: 'br',
    level: 'inline',
    tokenizer(src) {
        // Match HTML <br> tags (with or without closing slash, case insensitive)
        const match = src.match(/^<br\s*\/?>/i);
        if (match) {
            return {
                type: 'br',
                raw: match[0]
            };
        }
        return undefined;
    }
};
