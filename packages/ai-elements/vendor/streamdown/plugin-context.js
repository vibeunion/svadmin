import { getContext, setContext } from 'svelte';
import { findCustomRenderer } from './plugins.js';
export { STREAMDOWN_CONTEXT_KEY } from './context-key.js';
export { StreamdownContext, useStreamdown } from './context.svelte.js';
const PLUGIN_CONTEXT_KEY = Symbol('streamdown.plugins');
const defaultPluginGetter = {
    getValue: () => null
};
export const PluginContext = {
    key: PLUGIN_CONTEXT_KEY,
    provide(getValue) {
        const value = { getValue };
        setContext(PLUGIN_CONTEXT_KEY, value);
        return value;
    },
    set(plugins) {
        return this.provide(() => plugins ?? null);
    },
    get() {
        return (getContext(PLUGIN_CONTEXT_KEY) ?? defaultPluginGetter).getValue();
    }
};
export function usePlugins() {
    return PluginContext.get();
}
export function useCodePlugin() {
    return usePlugins()?.code ?? null;
}
export function useMermaidPlugin() {
    return usePlugins()?.mermaid ?? null;
}
export function useMathPlugin() {
    return usePlugins()?.math ?? null;
}
export function useCjkPlugin() {
    return usePlugins()?.cjk ?? null;
}
export function useCustomRenderer(language) {
    return findCustomRenderer(usePlugins()?.renderers, language) ?? null;
}
