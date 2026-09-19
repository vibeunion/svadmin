type ClickOutsideHandlerOptions = {
    isActive: boolean;
    callback: () => void;
};
export declare const useClickOutside: (props: ClickOutsideHandlerOptions) => {
    readonly attachment: ((node: HTMLElement) => () => void) | null;
};
export {};
