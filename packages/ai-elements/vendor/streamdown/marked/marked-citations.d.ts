import type { Extension } from './index.js';
export declare const markedCitations: Extension;
export type CitationToken = {
    type: 'inline-citations';
    keys: string[];
    text: string;
    raw: string;
};
