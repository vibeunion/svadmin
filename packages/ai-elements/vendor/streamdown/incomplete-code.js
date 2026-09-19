import { getContext } from 'svelte';
import { hasIncompleteCodeFence as detectIncompleteCodeFence } from './utils/code-block.js';
export const STREAMDOWN_BLOCK_CONTEXT = 'STREAMDOWN_BLOCK';
const TABLE_DELIMITER_PATTERN = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;
export const hasIncompleteCodeFence = detectIncompleteCodeFence;
export const hasTable = (markdown) => {
    for (const line of markdown.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || !trimmed.includes('|')) {
            continue;
        }
        if (TABLE_DELIMITER_PATTERN.test(trimmed)) {
            return true;
        }
    }
    return false;
};
export function useIsCodeFenceIncomplete() {
    return Boolean(getContext(STREAMDOWN_BLOCK_CONTEXT)?.isIncompleteCodeFence);
}
export function useStreamdownBlockRaw() {
    return getContext(STREAMDOWN_BLOCK_CONTEXT)?.rawBlock;
}
