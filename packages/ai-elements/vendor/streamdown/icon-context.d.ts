import { type Snippet } from 'svelte';
import type { IconMap } from './context.svelte.js';
export type { IconMap } from './context.svelte.js';
export { checkIcon, chevronLeft, chevronRight, copyIcon, downloadIcon, fitViewIcon, fullscreenIcon, resolveIcon, type IconSnippet, type ResolvedIconName, zoomInIcon, zoomOutIcon } from './Elements/icons.js';
import { resolveIcon } from './Elements/icons.js';
type IconContextGetter = {
    getValue: () => IconMap;
};
declare const defaultIcons: {
    CheckIcon: import("./Elements/icons.js").IconSnippet;
    CopyIcon: import("./Elements/icons.js").IconSnippet;
    DownloadIcon: import("./Elements/icons.js").IconSnippet;
    Maximize2Icon: import("./Elements/icons.js").IconSnippet;
    RotateCcwIcon: import("./Elements/icons.js").IconSnippet;
    ZoomInIcon: import("./Elements/icons.js").IconSnippet;
    ZoomOutIcon: import("./Elements/icons.js").IconSnippet;
    check: import("./Elements/icons.js").IconSnippet;
    copy: import("./Elements/icons.js").IconSnippet;
    download: import("./Elements/icons.js").IconSnippet;
    fullscreen: import("./Elements/icons.js").IconSnippet;
    zoomIn: import("./Elements/icons.js").IconSnippet;
    zoomOut: import("./Elements/icons.js").IconSnippet;
    fitView: import("./Elements/icons.js").IconSnippet;
    chevronLeft: import("./Elements/icons.js").IconSnippet;
    chevronRight: import("./Elements/icons.js").IconSnippet;
};
export { defaultIcons };
export type IconComponent = Snippet<[]>;
export declare const IconContext: {
    key: symbol;
    provide(getValue: () => Partial<IconMap> | undefined): IconContextGetter;
    set(icons: Partial<IconMap> | undefined): IconContextGetter;
    get(): IconMap;
};
export declare function useIcons(): IconMap;
export declare function resolveProvidedIcon(name: Parameters<typeof resolveIcon>[1], fallback: Snippet<[]>): import("./Elements/icons.js").IconSnippet;
