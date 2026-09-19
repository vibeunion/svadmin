export const preprocessCustomTags = (markdown, tagNames) => {
    if (!tagNames.length) {
        return markdown;
    }
    let result = markdown;
    for (const tagName of tagNames) {
        const pattern = new RegExp(`(<${tagName}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${tagName}\\s*>)`, 'gi');
        result = result.replace(pattern, (_match, open, content, close) => {
            if (!content.includes('\n\n')) {
                return open + content + close;
            }
            const fixedContent = content.replace(/\n\n/g, '\n<!---->\n');
            const paddedContent = (fixedContent.startsWith('\n') ? '' : '\n') +
                fixedContent +
                (fixedContent.endsWith('\n') ? '' : '\n');
            return `${open}${paddedContent}${close}\n\n`;
        });
    }
    return result;
};
