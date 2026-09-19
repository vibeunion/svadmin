import { escapeHtml, renderMarkdownFragment } from '../security/html.js';
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const isSecurityHtmlBlock = (markdown, { allowedTags, skipHtml }) => {
    if (skipHtml) {
        return false;
    }
    const trimmed = markdown.trimStart();
    if (trimmed.startsWith('<')) {
        return true;
    }
    return Object.keys(allowedTags ?? {}).some((tagName) => new RegExp(`<\\/?${escapeRegExp(tagName)}(?=[\\s>/])`, 'i').test(markdown));
};
export const renderBlockHtml = (markdown, options) => {
    if (!isSecurityHtmlBlock(markdown, options)) {
        return null;
    }
    if (options.renderHtml === false) {
        return escapeHtml(markdown);
    }
    return renderMarkdownFragment(markdown, {
        allowedImagePrefixes: options.allowedImagePrefixes,
        allowedLinkPrefixes: options.allowedLinkPrefixes,
        allowedTags: options.allowedTags,
        defaultOrigin: options.defaultOrigin,
        urlTransform: options.urlTransform
    });
};
