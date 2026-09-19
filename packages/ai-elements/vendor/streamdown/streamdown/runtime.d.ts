import type { StreamdownContext as StreamdownContextContract } from '../contracts/streamdown.js';
type RuntimeGetter<T> = () => T;
type RuntimeSectionGetters<T extends object> = {
    [K in keyof T]-?: RuntimeGetter<T[K]>;
};
type ParseRuntimeShape<Source extends Record<string, any>> = Pick<StreamdownContextContract<Source>, 'content' | 'remend' | 'parseIncompleteMarkdown' | 'parseMarkdownIntoBlocksFn' | 'mode' | 'dir' | 'sources' | 'inlineCitationsMode' | 'extensions'>;
type SecurityRuntimeShape<Source extends Record<string, any>> = Pick<StreamdownContextContract<Source>, 'defaultOrigin' | 'allowedLinkPrefixes' | 'allowedImagePrefixes' | 'linkSafety' | 'allowedTags' | 'allowedElements' | 'allowElement' | 'disallowedElements' | 'literalTagContent' | 'normalizeHtmlIndentation' | 'skipHtml' | 'unwrapDisallowed' | 'urlTransform' | 'renderHtml'>;
type RenderRuntimeShape<Source extends Record<string, any>> = Pick<StreamdownContextContract<Source>, 'BlockComponent' | 'prefix' | 'lineNumbers' | 'shikiTheme' | 'snippets' | 'theme' | 'baseTheme' | 'mermaidConfig' | 'mermaid' | 'katexConfig' | 'plugins' | 'translations' | 'shikiLanguages' | 'shikiThemes' | 'children' | 'mdxComponents' | 'components'>;
type UiConfigRuntimeShape<Source extends Record<string, any>> = Pick<StreamdownContextContract<Source>, 'element' | 'animation' | 'isAnimating' | 'animated' | 'caret' | 'onAnimationStart' | 'onAnimationEnd' | 'controls' | 'codeControls' | 'icons'>;
export declare const parseRuntimeKeys: readonly ["content", "remend", "parseIncompleteMarkdown", "parseMarkdownIntoBlocksFn", "mode", "dir", "sources", "inlineCitationsMode", "extensions"];
export declare const securityRuntimeKeys: readonly ["defaultOrigin", "allowedLinkPrefixes", "allowedImagePrefixes", "linkSafety", "allowedTags", "allowedElements", "allowElement", "disallowedElements", "literalTagContent", "normalizeHtmlIndentation", "skipHtml", "unwrapDisallowed", "urlTransform", "renderHtml"];
export declare const renderRuntimeKeys: readonly ["BlockComponent", "prefix", "lineNumbers", "shikiTheme", "snippets", "theme", "baseTheme", "mermaidConfig", "mermaid", "katexConfig", "plugins", "translations", "shikiLanguages", "shikiThemes", "children", "mdxComponents", "components"];
export declare const uiConfigRuntimeKeys: readonly ["element", "animation", "isAnimating", "animated", "caret", "onAnimationStart", "onAnimationEnd", "controls", "codeControls", "icons"];
export type StreamdownParseRuntimeInit<Source extends Record<string, any>> = RuntimeSectionGetters<ParseRuntimeShape<Source>>;
export type StreamdownSecurityRuntimeInit<Source extends Record<string, any>> = RuntimeSectionGetters<SecurityRuntimeShape<Source>>;
export type StreamdownRenderRuntimeInit<Source extends Record<string, any>> = RuntimeSectionGetters<RenderRuntimeShape<Source>>;
export type StreamdownUiConfigRuntimeInit<Source extends Record<string, any>> = RuntimeSectionGetters<UiConfigRuntimeShape<Source>>;
export type StreamdownRuntimeSectionName = 'parse' | 'security' | 'render' | 'uiConfig';
export type StreamdownRuntimeSections<Source extends Record<string, any>> = {
    parse: StreamdownParseRuntimeInit<Source>;
    security: StreamdownSecurityRuntimeInit<Source>;
    render: StreamdownRenderRuntimeInit<Source>;
    uiConfig: StreamdownUiConfigRuntimeInit<Source>;
};
export declare const streamdownRuntimeSectionKeys: {
    readonly parse: readonly ["content", "remend", "parseIncompleteMarkdown", "parseMarkdownIntoBlocksFn", "mode", "dir", "sources", "inlineCitationsMode", "extensions"];
    readonly security: readonly ["defaultOrigin", "allowedLinkPrefixes", "allowedImagePrefixes", "linkSafety", "allowedTags", "allowedElements", "allowElement", "disallowedElements", "literalTagContent", "normalizeHtmlIndentation", "skipHtml", "unwrapDisallowed", "urlTransform", "renderHtml"];
    readonly render: readonly ["BlockComponent", "prefix", "lineNumbers", "shikiTheme", "snippets", "theme", "baseTheme", "mermaidConfig", "mermaid", "katexConfig", "plugins", "translations", "shikiLanguages", "shikiThemes", "children", "mdxComponents", "components"];
    readonly uiConfig: readonly ["element", "animation", "isAnimating", "animated", "caret", "onAnimationStart", "onAnimationEnd", "controls", "codeControls", "icons"];
};
export declare function defineRuntimeSectionBridge<Source extends Record<string, any>>(target: object, sectionName: 'parse', getSection: () => ParseRuntimeShape<Source>): void;
export declare function defineRuntimeSectionBridge<Source extends Record<string, any>>(target: object, sectionName: 'security', getSection: () => SecurityRuntimeShape<Source>): void;
export declare function defineRuntimeSectionBridge<Source extends Record<string, any>>(target: object, sectionName: 'render', getSection: () => RenderRuntimeShape<Source>): void;
export declare function defineRuntimeSectionBridge<Source extends Record<string, any>>(target: object, sectionName: 'uiConfig', getSection: () => UiConfigRuntimeShape<Source>): void;
export interface StreamdownParseRuntime<Source extends Record<string, any> = Record<string, any>> extends ParseRuntimeShape<Source> {
}
export declare class StreamdownParseRuntime<Source extends Record<string, any> = Record<string, any>> {
    private readonly getters;
    constructor(getters: StreamdownParseRuntimeInit<Source>);
}
export interface StreamdownSecurityRuntime<Source extends Record<string, any> = Record<string, any>> extends SecurityRuntimeShape<Source> {
}
export declare class StreamdownSecurityRuntime<Source extends Record<string, any> = Record<string, any>> {
    private readonly getters;
    constructor(getters: StreamdownSecurityRuntimeInit<Source>);
}
export interface StreamdownRenderRuntime<Source extends Record<string, any> = Record<string, any>> extends RenderRuntimeShape<Source> {
}
export declare class StreamdownRenderRuntime<Source extends Record<string, any> = Record<string, any>> {
    private readonly getters;
    constructor(getters: StreamdownRenderRuntimeInit<Source>);
}
export interface StreamdownUiConfigRuntime<Source extends Record<string, any> = Record<string, any>> extends UiConfigRuntimeShape<Source> {
}
export declare class StreamdownUiConfigRuntime<Source extends Record<string, any> = Record<string, any>> {
    private readonly getters;
    constructor(getters: StreamdownUiConfigRuntimeInit<Source>);
}
export {};
