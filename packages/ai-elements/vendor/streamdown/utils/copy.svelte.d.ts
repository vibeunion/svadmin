export declare const useCopy: (opts: {
    content: string;
    timeout?: number;
}) => {
    readonly isCopied: boolean;
    copy: () => Promise<void>;
};
