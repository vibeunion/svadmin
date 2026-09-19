import type { StreamdownToken } from './marked/index.js';
export type MarkdownElement = {
    tagName: string;
    properties: Record<string, unknown>;
};
export type MarkdownParent = MarkdownElement & {
    children?: readonly MarkdownElement[];
};
export type AllowElement = (element: Readonly<MarkdownElement>, index: number, parent: Readonly<MarkdownParent> | undefined) => boolean | null | undefined;
export type UrlTransform = (url: string, key: string, node: Readonly<MarkdownElement>) => string | null | undefined;
export declare const defaultUrlTransform: UrlTransform;
export type MarkdownFilteringOptions = {
    allowElement?: AllowElement;
    allowedElements?: readonly string[];
    disallowedElements?: readonly string[];
    skipHtml?: boolean;
    unwrapDisallowed?: boolean;
};
export declare const createMarkdownElement: (tagName: string, properties?: Record<string, unknown>, children?: readonly MarkdownElement[]) => MarkdownParent;
export declare const applyMarkdownUrlTransform: (url: string, key: string, node: Readonly<MarkdownElement>, urlTransform?: UrlTransform) => string | null | undefined;
export declare const filterMarkdownTokens: (tokens: StreamdownToken[], options: MarkdownFilteringOptions) => StreamdownToken[];
