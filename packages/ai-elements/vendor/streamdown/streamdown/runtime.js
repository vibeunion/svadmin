import { defineGetterBackedProperties, defineForwardedProperties } from '../utils/bind.js';
const defineRuntimeSectionProperties = (target, getters, keys) => {
    defineGetterBackedProperties(target, getters, keys);
};
export const parseRuntimeKeys = [
    'content',
    'remend',
    'parseIncompleteMarkdown',
    'parseMarkdownIntoBlocksFn',
    'mode',
    'dir',
    'sources',
    'inlineCitationsMode',
    'extensions'
];
export const securityRuntimeKeys = [
    'defaultOrigin',
    'allowedLinkPrefixes',
    'allowedImagePrefixes',
    'linkSafety',
    'allowedTags',
    'allowedElements',
    'allowElement',
    'disallowedElements',
    'literalTagContent',
    'normalizeHtmlIndentation',
    'skipHtml',
    'unwrapDisallowed',
    'urlTransform',
    'renderHtml'
];
export const renderRuntimeKeys = [
    'BlockComponent',
    'prefix',
    'lineNumbers',
    'shikiTheme',
    'snippets',
    'theme',
    'baseTheme',
    'mermaidConfig',
    'mermaid',
    'katexConfig',
    'plugins',
    'translations',
    'shikiLanguages',
    'shikiThemes',
    'children',
    'mdxComponents',
    'components'
];
export const uiConfigRuntimeKeys = [
    'element',
    'animation',
    'isAnimating',
    'animated',
    'caret',
    'onAnimationStart',
    'onAnimationEnd',
    'controls',
    'codeControls',
    'icons'
];
export const streamdownRuntimeSectionKeys = {
    parse: parseRuntimeKeys,
    security: securityRuntimeKeys,
    render: renderRuntimeKeys,
    uiConfig: uiConfigRuntimeKeys
};
export function defineRuntimeSectionBridge(target, sectionName, getSection) {
    switch (sectionName) {
        case 'parse':
            defineForwardedProperties(target, () => getSection(), parseRuntimeKeys);
            return;
        case 'security':
            defineForwardedProperties(target, () => getSection(), securityRuntimeKeys);
            return;
        case 'render':
            defineForwardedProperties(target, () => getSection(), renderRuntimeKeys);
            return;
        case 'uiConfig':
            defineForwardedProperties(target, () => getSection(), uiConfigRuntimeKeys);
            return;
    }
}
export class StreamdownParseRuntime {
    getters;
    constructor(getters) {
        this.getters = getters;
        defineRuntimeSectionProperties(this, getters, parseRuntimeKeys);
    }
}
export class StreamdownSecurityRuntime {
    getters;
    constructor(getters) {
        this.getters = getters;
        defineRuntimeSectionProperties(this, getters, securityRuntimeKeys);
    }
}
export class StreamdownRenderRuntime {
    getters;
    constructor(getters) {
        this.getters = getters;
        defineRuntimeSectionProperties(this, getters, renderRuntimeKeys);
    }
}
export class StreamdownUiConfigRuntime {
    getters;
    constructor(getters) {
        this.getters = getters;
        defineRuntimeSectionProperties(this, getters, uiConfigRuntimeKeys);
    }
}
