import { type Tokens } from 'marked';
import { type UrlTransform } from '../markdown.js';
import type { AllowedTags } from './types.js';
type HtmlRenderOverride = boolean | ((token: Tokens.HTML | Tokens.Tag) => string) | undefined;
type SecurityRenderOptions = {
    allowedImagePrefixes?: string[];
    allowedLinkPrefixes?: string[];
    allowedTags?: AllowedTags;
    defaultOrigin?: string;
    skipHtml?: boolean;
    urlTransform?: UrlTransform;
};
export declare const escapeHtml: (value: string) => string;
export declare function normalizeHtmlIndentation(content: string): string;
export declare function renderMarkdownFragment(source: string, { allowedImagePrefixes, allowedLinkPrefixes, allowedTags, defaultOrigin, urlTransform }?: SecurityRenderOptions): string;
export declare function renderHtmlToken(token: Tokens.HTML | Tokens.Tag, { renderHtml, ...options }?: SecurityRenderOptions & {
    renderHtml?: HtmlRenderOverride;
}): string;
export {};
