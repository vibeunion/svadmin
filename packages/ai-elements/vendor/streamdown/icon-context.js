import { getContext, setContext } from 'svelte';
export { checkIcon, chevronLeft, chevronRight, copyIcon, downloadIcon, fitViewIcon, fullscreenIcon, resolveIcon, zoomInIcon, zoomOutIcon } from './Elements/icons.js';
import { checkIcon, chevronLeft, chevronRight, copyIcon, downloadIcon, fitViewIcon, fullscreenIcon, resolveIcon, zoomInIcon, zoomOutIcon } from './Elements/icons.js';
const ICON_CONTEXT_KEY = Symbol('streamdown.icons');
const defaultIcons = {
    CheckIcon: checkIcon,
    CopyIcon: copyIcon,
    DownloadIcon: downloadIcon,
    Maximize2Icon: fullscreenIcon,
    RotateCcwIcon: fitViewIcon,
    ZoomInIcon: zoomInIcon,
    ZoomOutIcon: zoomOutIcon,
    check: checkIcon,
    copy: copyIcon,
    download: downloadIcon,
    fullscreen: fullscreenIcon,
    zoomIn: zoomInIcon,
    zoomOut: zoomOutIcon,
    fitView: fitViewIcon,
    chevronLeft,
    chevronRight
};
const mergeIcons = (icons) => ({
    ...defaultIcons,
    ...(icons ?? {})
});
const defaultIconGetter = {
    getValue: () => defaultIcons
};
export { defaultIcons };
export const IconContext = {
    key: ICON_CONTEXT_KEY,
    provide(getValue) {
        const value = {
            getValue: () => mergeIcons(getValue())
        };
        setContext(ICON_CONTEXT_KEY, value);
        return value;
    },
    set(icons) {
        return this.provide(() => icons);
    },
    get() {
        return (getContext(ICON_CONTEXT_KEY) ?? defaultIconGetter).getValue();
    }
};
export function useIcons() {
    return IconContext.get();
}
export function resolveProvidedIcon(name, fallback) {
    return resolveIcon(useIcons(), name, fallback);
}
