type KeyFramesOptions = {
    duration: number;
    easing: string;
    fill: 'auto' | 'backwards' | 'both' | 'forwards' | 'none';
};
export interface StepperState<Item> {
    readonly items: Item[];
    keyFramesOptions: KeyFramesOptions;
}
export declare class StepperState<Item> {
    readonly items: Item[];
    keyFramesOptions: KeyFramesOptions;
    activeStep: number;
    destinationOffset: number;
    stepAnimation: Animation | undefined;
    offsets: number[];
    stepHeights: number[];
    stepContainer: HTMLElement | null;
    isAnimating: boolean;
    constructor(props: {
        items: Item[];
        keyFramesOptions: KeyFramesOptions;
    });
    translate: () => void;
    setActiveStep: (i: number) => () => void;
    scroller: (node: HTMLElement) => {
        destroy: () => void;
    };
    next: () => void;
    previous: () => void;
    goTo: (i: number) => void;
    get canGoNext(): boolean;
    get canGoPrevious(): boolean;
    canGoToStep: (targetStep: number) => boolean;
}
export {};
