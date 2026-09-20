import remend from '@streamdown-svelte/remend';
import { IncompleteMarkdownParser } from '../remend.js';
const LOCAL_RECOVERY_PLUGIN_NAMES = [
    'strikethrough',
    'doubleUnderscoreItalic',
    'singleAsteriskItalic',
    'singleUnderscoreItalic',
    'inlineCode',
    'links'
];
const NON_DEFAULT_DISABLED_OPTIONS = [
    'bold',
    'boldItalic',
    'comparisonOperators',
    'htmlTags',
    'images',
    'inlineCode',
    'italic',
    'katex',
    'links',
    'setextHeadings',
    'singleTilde',
    'strikethrough'
];
const createStreamdownDefaultPlugins = () => {
    const plugins = IncompleteMarkdownParser.createDefaultPlugins();
    const localPluginNames = new Set(LOCAL_RECOVERY_PLUGIN_NAMES);
    const localPlugins = new Map(plugins
        .filter((plugin) => localPluginNames.has(plugin.name))
        .map((plugin) => [plugin.name, plugin]));
    const basePlugins = plugins.filter((plugin) => !localPluginNames.has(plugin.name));
    const boldPluginIndex = basePlugins.findIndex((plugin) => plugin.name === 'bold');
    if (boldPluginIndex === -1) {
        return plugins;
    }
    basePlugins.splice(boldPluginIndex + 1, 0, ...LOCAL_RECOVERY_PLUGIN_NAMES.map((pluginName) => localPlugins.get(pluginName)).filter((plugin) => plugin != null));
    return basePlugins;
};
const defaultParser = new IncompleteMarkdownParser(createStreamdownDefaultPlugins());
const hasNonDefaultRemendConfiguration = (options) => {
    if (!options) {
        return false;
    }
    if ((options.handlers?.length ?? 0) > 0) {
        return true;
    }
    if (options.inlineKatex === true) {
        return true;
    }
    if (options.linkMode && options.linkMode !== 'protocol') {
        return true;
    }
    return NON_DEFAULT_DISABLED_OPTIONS.some((optionKey) => options[optionKey] === false);
};
export const createStreamdownIncompleteMarkdownParser = (options) => hasNonDefaultRemendConfiguration(options)
    ? new IncompleteMarkdownParser(IncompleteMarkdownParser.createDefaultPlugins())
    : new IncompleteMarkdownParser(createStreamdownDefaultPlugins());
export const repairIncompleteMarkdown = (text, options) => {
    if (!text || typeof text !== 'string') {
        return text;
    }
    if (text.trim().length === 0) {
        return '';
    }
    if (hasNonDefaultRemendConfiguration(options)) {
        return remend(text, options);
    }
    return defaultParser.parse(text);
};
export const parseStreamdownIncompleteMarkdown = repairIncompleteMarkdown;
export const repairStreamdownRenderedMarkdown = (text, options) => {
    if (!text || typeof text !== 'string') {
        return text;
    }
    if (text.trim().length === 0) {
        return '';
    }
    return remend(text, options);
};
