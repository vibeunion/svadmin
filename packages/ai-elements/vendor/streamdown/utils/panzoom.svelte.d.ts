export interface PanzoomOptions {
    enabled?: boolean | (() => boolean);
    minZoom?: number;
    maxZoom?: number;
    zoomSpeed?: number;
    doubleClickScale?: number;
    initialScale?: number;
    initialX?: number;
    initialY?: number;
    activateMouseWheel?: boolean | (() => boolean);
}
export interface ExpandOptions {
    padding?: number;
    duration?: number;
    easing?: string;
    zIndex?: number;
    fitRatio?: number;
}
export declare const usePanzoom: (opts?: PanzoomOptions) => {
    attach: (target: HTMLElement | SVGSVGElement) => () => void;
    zoomToFit: (padding?: number) => void;
    zoomBy: (factor: number) => void;
    zoomIn: (factor?: number) => void;
    zoomOut: (factor?: number) => void;
    moveBy: (dx: number, dy: number) => void;
    setTransform: (nx: number, ny: number, ns: number) => void;
    expand: (expand: boolean) => void;
    toggleExpand: () => Promise<void>;
    readonly transform: {
        readonly x: number;
        readonly y: number;
        readonly scale: number;
    };
    readonly expanded: boolean;
};
