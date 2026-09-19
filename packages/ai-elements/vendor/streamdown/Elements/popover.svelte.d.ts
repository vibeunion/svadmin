export declare class Popover {
    isOpen: boolean;
    content: HTMLElement | undefined;
    reference: HTMLButtonElement | undefined;
    constructor();
    place: (node: HTMLElement) => Promise<void>;
    popoverAttachment: (node: HTMLElement) => () => void;
}
