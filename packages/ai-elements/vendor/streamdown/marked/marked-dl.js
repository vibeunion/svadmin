export const markedDl = {
    name: 'descriptionList',
    level: 'block', // Is this a block-level or inline-level tokenizer?
    tokenizer(src) {
        const rule = /^(?:[ \t]*:[^:\n]+:[ \t]?[^\n]*(?:\n|$))+/;
        const match = rule.exec(src);
        if (match) {
            const text = match[0].trim();
            const tokens = [];
            // Parse each line as a description
            const lines = text.split('\n');
            for (const line of lines) {
                const lineMatch = /^\s*:([^:\n]+):([^:\n]*)(?:\n|$)/.exec(line);
                if (lineMatch) {
                    const term = lineMatch[1].trim();
                    const detail = lineMatch[2].trim();
                    tokens.push({
                        type: 'description',
                        raw: lineMatch[0],
                        tokens: [
                            {
                                type: 'descriptionTerm',
                                raw: term,
                                tokens: this.lexer.inlineTokens(term)
                            },
                            {
                                type: 'descriptionDetail',
                                raw: detail,
                                tokens: this.lexer.inlineTokens(detail)
                            }
                        ]
                    });
                }
            }
            const token = {
                type: 'descriptionList',
                raw: match[0],
                text: text,
                tokens: tokens
            };
            return token;
        }
    }
};
