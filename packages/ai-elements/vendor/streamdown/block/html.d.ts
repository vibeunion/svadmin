import type { Tokens } from 'marked';
import type { UrlTransform } from '../markdown.js';
import type { AllowedTags } from '../security/types.js';
export type BlockHtmlRenderOptions = {
    allowedImagePrefixes?: string[];
    allowedLinkPrefixes?: string[];
    allowedTags?: AllowedTags;
    defaultOrigin?: string;
    renderHtml?: boolean | ((token: Tokens.HTML | Tokens.Tag) => string);
    skipHtml?: boolean;
    urlTransform?: UrlTransform;
};
export declare const isSecurityHtmlBlock: (markdown: string, { allowedTags, skipHtml }: Pick<BlockHtmlRenderOptions, "allowedTags" | "skipHtml">) => boolean;
export declare const renderBlockHtml: (markdown: string, options: BlockHtmlRenderOptions) => string | null;
