import { normalizeMermaidControls } from '../context.svelte.js';
import { getThemeName } from '../plugins.js';
import { createCn, mergeTheme, prefixThemeClasses, shadcnTheme, theme as tailwindTheme } from '../theme.js';
const animationNameMap = {
    blurIn: 'blur',
    fadeIn: 'fade',
    slideUp: 'slideUp'
};
export const defaultLinkSafetyConfig = {
    enabled: true
};
export const defaultShikiTheme = ['github-light', 'github-dark'];
export const footnoteDefinitionPattern = /\[\^[\w-]{1,200}\]:/;
export const resolveShikiThemePair = (theme) => {
    if (Array.isArray(theme)) {
        return [theme[0] ?? defaultShikiTheme[0], theme[1] ?? theme[0] ?? defaultShikiTheme[1]];
    }
    if (theme) {
        return [theme, theme];
    }
    return defaultShikiTheme;
};
export const collectThemeRegistrations = (themes) => Object.fromEntries(themes
    .filter((theme) => typeof theme !== 'string')
    .map((theme) => [getThemeName(theme), theme]));
export const resolveCompatAnimation = (animated, isAnimating, mode) => {
    if (!animated || !isAnimating || mode === 'static') {
        return {
            enabled: false
        };
    }
    if (animated === true) {
        return {
            enabled: true,
            animateOnMount: true,
            type: 'fade',
            duration: 150,
            timingFunction: 'ease',
            tokenize: 'word',
            stagger: 40
        };
    }
    const animationName = (typeof animated.animation === 'string' && animated.animation.length > 0
        ? (animationNameMap[animated.animation] ??
            animated.animation)
        : undefined) ?? 'fade';
    const timingFunction = typeof animated.easing === 'string' && animated.easing.trim().length > 0
        ? animated.easing
        : 'ease';
    return {
        enabled: true,
        animateOnMount: true,
        type: animationName,
        duration: animated.duration ?? 150,
        timingFunction,
        tokenize: animated.sep ?? 'word',
        stagger: animated.stagger ?? 40
    };
};
export const resolveControls = (controls) => {
    if (controls === false) {
        return {
            controls: {
                code: false,
                mermaid: normalizeMermaidControls(false),
                table: false
            },
            codeControls: {
                copy: false,
                download: false
            }
        };
    }
    const codeControls = controls === true || controls === undefined ? true : (controls.code ?? true);
    const tableControls = controls === true || controls === undefined ? true : (controls.table ?? true);
    const mermaidControls = controls === true || controls === undefined ? undefined : controls.mermaid;
    return {
        controls: {
            code: codeControls !== false,
            mermaid: normalizeMermaidControls(mermaidControls),
            table: tableControls
        },
        codeControls: codeControls === false
            ? {
                copy: false,
                download: false
            }
            : codeControls === true
                ? {
                    copy: true,
                    download: true
                }
                : {
                    copy: codeControls.copy ?? true,
                    download: codeControls.download ?? true
                }
    };
};
export const resolveAnimationConfig = ({ animation, animated, isAnimating, mode }) => {
    if (animation) {
        if (!animation.enabled) {
            return {
                enabled: false
            };
        }
        return {
            enabled: true,
            animateOnMount: animation.animateOnMount ?? false,
            type: animation.type || 'blur',
            duration: animation.duration ?? 500,
            timingFunction: animation.timingFunction || 'ease-in',
            tokenize: animation.tokenize || 'word',
            stagger: animation.stagger ?? 0
        };
    }
    return resolveCompatAnimation(animated, isAnimating, mode);
};
export const resolveThemeClassMap = ({ theme, baseTheme, shouldMergeTheme, prefix }) => {
    const fallbackTheme = baseTheme === 'shadcn' ? shadcnTheme : tailwindTheme;
    const mergedTheme = shouldMergeTheme || theme ? mergeTheme(theme, baseTheme) : fallbackTheme;
    return prefixThemeClasses(prefix, mergedTheme);
};
export const resolveRootClassName = ({ className, futureClassName, prefix, shouldShowCaret, shouldHideCaret }) => createCn(prefix)('whitespace-normal', [className, futureClassName].filter((value) => Boolean(value)).join(' '), shouldShowCaret &&
    !shouldHideCaret &&
    '[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]');
