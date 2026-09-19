import { createMarkedMathExtensions } from './marked/marked-math.js';
export { cjk, createCjkPlugin } from './plugins/cjk-shared.js';
import { createCodePlugin as createSharedCodePlugin, createMathPlugin as createSharedMathPlugin, createMermaidPlugin as createSharedMermaidPlugin, getThemeName } from '@streamdown-svelte/plugin-core';
import { bundledLanguagesInfo } from './utils/bundledLanguages.js';
export { getThemeName };
const CJK_AUTOLINK_BOUNDARY_CHARS = '[。．，、？！：；）】」』〉》]';
const CJK_AUTOLINK_PREFIX_CHARS = '(^|[\\s（【「『〈《：])';
const CJK_AUTOLINK_PATTERN = new RegExp(`${CJK_AUTOLINK_PREFIX_CHARS}((?:https?:\\/\\/|mailto:)[^\\s<>。．，、？！：；（）【】「」『』〈〉《》]+)(?=${CJK_AUTOLINK_BOUNDARY_CHARS})`, 'gu');
export function extractCodeFenceMeta(token) {
    const firstLine = token.raw.split('\n', 1)[0]?.trimEnd() ?? '';
    if (!firstLine.startsWith('```')) {
        const language = token.lang?.trim() ?? '';
        const parts = language.split(/\s+/);
        return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    }
    const fenceContent = firstLine.slice(3).trim();
    if (!fenceContent) {
        const language = token.lang?.trim() ?? '';
        const parts = language.split(/\s+/);
        return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    }
    const language = extractCodeFenceLanguage(token);
    if (!language || fenceContent === language) {
        const langValue = token.lang?.trim() ?? '';
        const parts = langValue.split(/\s+/);
        return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    }
    const meta = fenceContent.startsWith(language)
        ? fenceContent.slice(language.length).trim()
        : fenceContent;
    return meta.length > 0 ? meta : undefined;
}
export function extractCodeFenceLanguage(token) {
    const langValue = token.lang?.trim() ?? '';
    if (langValue) {
        return langValue.split(/\s+/, 1)[0] ?? '';
    }
    const firstLine = token.raw.split('\n', 1)[0]?.trimEnd() ?? '';
    if (!firstLine.startsWith('```')) {
        return '';
    }
    const fenceContent = firstLine.slice(3).trim();
    if (!fenceContent) {
        return '';
    }
    return fenceContent.split(/\s+/, 1)[0] ?? token.lang ?? '';
}
export function findCustomRenderer(renderers, language) {
    if (!(renderers && language)) {
        return null;
    }
    return (renderers.find((renderer) => Array.isArray(renderer.language)
        ? renderer.language.includes(language)
        : renderer.language === language) ?? null);
}
export function getMathPluginOptions(plugin) {
    const defaultOptions = {
        errorColor: 'var(--color-muted-foreground)',
        singleDollarTextMath: false
    };
    if (!plugin) {
        return defaultOptions;
    }
    const remarkOptions = Array.isArray(plugin.remarkPlugin) && typeof plugin.remarkPlugin[1] === 'object'
        ? plugin.remarkPlugin[1]
        : {};
    const rehypeOptions = Array.isArray(plugin.rehypePlugin) && typeof plugin.rehypePlugin[1] === 'object'
        ? plugin.rehypePlugin[1]
        : {};
    return {
        errorColor: rehypeOptions.errorColor ?? defaultOptions.errorColor,
        singleDollarTextMath: remarkOptions.singleDollarTextMath ?? defaultOptions.singleDollarTextMath
    };
}
export function applyPluginMarkdownTransforms(markdown, plugins) {
    if (!plugins?.cjk) {
        return markdown;
    }
    return markdown.replace(CJK_AUTOLINK_PATTERN, (_match, prefix, url) => {
        return `${prefix}<${url}>`;
    });
}
export function resolveParserExtensions(extensions, plugins) {
    const singleDollarTextMath = getMathPluginOptions(plugins?.math).singleDollarTextMath;
    if (!singleDollarTextMath) {
        return extensions;
    }
    if (extensions?.some((extension) => extension.name === 'math')) {
        return extensions;
    }
    return [...createMarkedMathExtensions({ singleDollarTextMath: true }), ...(extensions ?? [])];
}
export function createCodePlugin(options = {}) {
    return createSharedCodePlugin({
        themes: options.themes,
        languages: options.languages ?? bundledLanguagesInfo
    });
}
export function createMathPlugin(options = {}) {
    return createSharedMathPlugin(options);
}
export function createMermaidPlugin(options = {}) {
    return createSharedMermaidPlugin(options);
}
export const code = /* @__PURE__ */ createCodePlugin();
export const math = /* @__PURE__ */ createMathPlugin();
export const mermaid = /* @__PURE__ */ createMermaidPlugin();
