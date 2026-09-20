const MARKDOWN_ESCAPE_RE = /([\\`*_~[\]|])/g;
const escapeMarkdown = (text) => text.replace(MARKDOWN_ESCAPE_RE, '\\$1');
export const preprocessLiteralTagContent = (markdown, tagNames) => {
    if (!tagNames.length) {
        return markdown;
    }
    let result = markdown;
    for (const tagName of tagNames) {
        const pattern = new RegExp(`(<${tagName}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${tagName}\\s*>)`, 'gi');
        result = result.replace(pattern, (_match, open, content, close) => {
            const escaped = escapeMarkdown(content).replace(/\n\n/g, '&#10;&#10;');
            return open + escaped + close;
        });
    }
    return result;
};
