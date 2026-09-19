import type { Extension } from './index.js';
import type { Token } from 'marked';
export declare const markedAlign: Extension;
export type AlignToken = {
    type: 'align';
    align: 'center' | 'right';
    raw: string;
    text: string;
    tokens: Token[];
};
