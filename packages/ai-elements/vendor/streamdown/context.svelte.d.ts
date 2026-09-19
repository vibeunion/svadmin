import type { Footnote, FootnoteRef } from './marked/marked-footnotes.js';
import type { StreamdownContext as StreamdownContextContract } from './contracts/streamdown.js';
export { normalizeMermaidControls } from './contracts/streamdown.js';
import { StreamdownParseRuntime, StreamdownRenderRuntime, StreamdownSecurityRuntime, StreamdownUiConfigRuntime, type StreamdownRuntimeSections } from './streamdown/runtime.js';
export type { AllowedTags, AnimateOptions, BlockProps, CodeControlsConfig, Components, ControlsConfig, IconMap, LinkSafetyConfig, LinkSafetyModalProps, MermaidControls, MermaidErrorComponentProps, MermaidOptions, NormalizedMermaidControls, ResolvedAnimationConfig, Snippets, StreamdownComponents, StreamdownControlsConfig, StreamdownProps, TableControlsConfig } from './contracts/streamdown.js';
export type { StreamdownParseRuntimeInit, StreamdownSecurityRuntimeInit, StreamdownRenderRuntimeInit, StreamdownUiConfigRuntimeInit, StreamdownRuntimeSections } from './streamdown/runtime.js';
export interface StreamdownContext<Source extends Record<string, any> = Record<string, any>> extends StreamdownContextContract<Source> {
}
export declare class StreamdownContext<Source extends Record<string, any> = Record<string, any>> {
    footnotes: {
        refs: Map<string, FootnoteRef>;
        footnotes: Map<string, Footnote>;
    };
    isMounted: boolean;
    readonly parse: StreamdownParseRuntime<Source>;
    readonly security: StreamdownSecurityRuntime<Source>;
    readonly render: StreamdownRenderRuntime<Source>;
    readonly uiConfig: StreamdownUiConfigRuntime<Source>;
    get animationTextStyle(): string | undefined;
    get animationBlockStyle(): string | undefined;
    constructor(props: StreamdownRuntimeSections<Source>);
}
export declare const useStreamdown: <Source extends Record<string, any> = Record<string, any>>() => StreamdownContext<Source>;
export type StreamdownContextType = StreamdownContext;
