import { type PluginConfig } from './plugins.js';
export type { AllowedTags, AnimateOptions, BlockProps, CodeControlsConfig, Components, ControlsConfig, IconMap, LinkSafetyConfig, LinkSafetyModalProps, MermaidControls, MermaidErrorComponentProps, MermaidOptions, NormalizedMermaidControls, ResolvedAnimationConfig, Snippets, StreamdownComponents, StreamdownContext as StreamdownContextType, StreamdownControlsConfig, StreamdownProps, TableControlsConfig } from './contracts/streamdown.js';
export { STREAMDOWN_CONTEXT_KEY } from './context-key.js';
export { StreamdownContext, useStreamdown } from './context.svelte.js';
type PluginContextGetter = {
    getValue: () => PluginConfig | null;
};
export declare const PluginContext: {
    key: symbol;
    provide(getValue: () => PluginConfig | null): PluginContextGetter;
    set(plugins: PluginConfig | null | undefined): PluginContextGetter;
    get(): PluginConfig | null;
};
export declare function usePlugins(): PluginConfig | null;
export declare function useCodePlugin(): import("@streamdown-svelte/plugin-core").CodeHighlighterPlugin | null;
export declare function useMermaidPlugin(): import("@streamdown-svelte/plugin-core").DiagramPlugin | null;
export declare function useMathPlugin(): import("@streamdown-svelte/plugin-core").MathPlugin | null;
export declare function useCjkPlugin(): import("@streamdown-svelte/plugin-core").CjkPlugin | null;
export declare function useCustomRenderer(language: string): import("./plugins.js").CustomRenderer | null;
