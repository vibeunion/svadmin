import { getContext, onMount, setContext } from 'svelte';
import { STREAMDOWN_CONTEXT_KEY } from './context-key.js';
export { normalizeMermaidControls } from './contracts/streamdown.js';
import { defineRuntimeSectionBridge, StreamdownParseRuntime, StreamdownRenderRuntime, StreamdownSecurityRuntime, StreamdownUiConfigRuntime } from './streamdown/runtime.js';
export class StreamdownContext {
    footnotes = {
        refs: new Map(),
        footnotes: new Map()
    };
    isMounted = false;
    parse;
    security;
    render;
    uiConfig;
    get animationTextStyle() {
        return getContext('POPOVER')
            ? undefined
            : this.animation.enabled
                ? `--sd-animation:sd-${this.animation.type};
--sd-duration:${this.animation.duration}ms;
--sd-easing:${this.animation.timingFunction};
animation-name: var(--sd-animation);
animation-duration: var(--sd-duration);
animation-timing-function: var(--sd-easing);
animation-delay: var(--sd-delay, 0ms);
animation-iteration-count: 1;
animation-fill-mode: forwards;
white-space: pre-wrap;
display: inline-block;
text-decoration: inherit;`
                : undefined;
    }
    get animationBlockStyle() {
        return getContext('POPOVER')
            ? undefined
            : this.animation.enabled
                ? `--sd-animation:sd-${this.animation.type};
--sd-duration:${this.animation.duration}ms;
--sd-easing:${this.animation.timingFunction};
animation-name: var(--sd-animation);
animation-duration: var(--sd-duration);
animation-timing-function: var(--sd-easing);
animation-delay: var(--sd-delay, 0ms);
animation-iteration-count: 1;
animation-fill-mode: forwards;`
                : undefined;
    }
    constructor(props) {
        this.parse = new StreamdownParseRuntime(props.parse);
        this.security = new StreamdownSecurityRuntime(props.security);
        this.render = new StreamdownRenderRuntime(props.render);
        this.uiConfig = new StreamdownUiConfigRuntime(props.uiConfig);
        defineRuntimeSectionBridge(this, 'parse', () => this.parse);
        defineRuntimeSectionBridge(this, 'security', () => this.security);
        defineRuntimeSectionBridge(this, 'render', () => this.render);
        defineRuntimeSectionBridge(this, 'uiConfig', () => this.uiConfig);
        setContext(STREAMDOWN_CONTEXT_KEY, this);
        if (this.animation.animateOnMount) {
            this.isMounted = true;
        }
        onMount(() => {
            this.isMounted = true;
        });
        $effect(() => {
            this.isMounted = this.animation.enabled;
        });
    }
}
export const useStreamdown = () => {
    const context = getContext(STREAMDOWN_CONTEXT_KEY);
    if (!context) {
        throw new Error('Streamdown context not found');
    }
    return context;
};
