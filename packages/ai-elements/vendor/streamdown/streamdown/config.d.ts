import { type ResolvedAnimationConfig, type StreamdownProps } from '../context.svelte.js';
import { type ThemeInput } from '../plugins.js';
import { type Theme } from '../theme.js';
export declare const defaultLinkSafetyConfig: {
    readonly enabled: true;
};
export declare const defaultShikiTheme: [ThemeInput, ThemeInput];
export declare const footnoteDefinitionPattern: RegExp;
export declare const resolveShikiThemePair: <Source extends Record<string, any>>(theme: StreamdownProps<Source>["shikiTheme"] | undefined) => [ThemeInput, ThemeInput];
export declare const collectThemeRegistrations: (themes: [ThemeInput, ThemeInput]) => Record<string, import("shiki").ThemeRegistration>;
export declare const resolveCompatAnimation: <Source extends Record<string, any>>(animated: StreamdownProps<Source>["animated"], isAnimating: boolean, mode: "static" | "streaming") => ResolvedAnimationConfig;
export declare const resolveControls: <Source extends Record<string, any>>(controls: StreamdownProps<Source>["controls"]) => {
    controls: {
        code: boolean;
        mermaid: import("../context.svelte.js").NormalizedMermaidControls;
        table: import("../context.svelte.js").TableControlsConfig;
    };
    codeControls: {
        copy: boolean;
        download: boolean;
    };
};
export declare const resolveAnimationConfig: <Source extends Record<string, any>>({ animation, animated, isAnimating, mode }: {
    animation: StreamdownProps<Source>["animation"];
    animated: StreamdownProps<Source>["animated"];
    isAnimating: boolean;
    mode: "static" | "streaming";
}) => ResolvedAnimationConfig;
export declare const resolveThemeClassMap: <Source extends Record<string, any>>({ theme, baseTheme, shouldMergeTheme, prefix }: {
    theme: StreamdownProps<Source>["theme"];
    baseTheme: StreamdownProps<Source>["baseTheme"];
    shouldMergeTheme: boolean;
    prefix: string | undefined;
}) => Theme;
export declare const resolveRootClassName: ({ className, futureClassName, prefix, shouldShowCaret, shouldHideCaret }: {
    className: string | undefined;
    futureClassName: string | undefined;
    prefix: string | undefined;
    shouldShowCaret: boolean;
    shouldHideCaret: boolean;
}) => string;
