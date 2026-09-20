import { hasIncompleteCodeFence as detectIncompleteCodeFence } from './utils/code-block.js';
export declare const STREAMDOWN_BLOCK_CONTEXT = "STREAMDOWN_BLOCK";
export declare const hasIncompleteCodeFence: typeof detectIncompleteCodeFence;
export declare const hasTable: (markdown: string) => boolean;
export declare function useIsCodeFenceIncomplete(): boolean;
export declare function useStreamdownBlockRaw(): string | undefined;
