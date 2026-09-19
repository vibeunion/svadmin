import type { Extension } from './index.js';
export declare const markedSub: Extension;
export declare const markedSup: Extension;
/**
 * Represents a subscript token.
 */
export type SubToken = {
    type: 'sub';
    raw: string;
    text: string;
    tokens: any[];
};
/**
 * Represents a superscript token.
 */
export type SupToken = {
    type: 'sup';
    raw: string;
    text: string;
    tokens: any[];
};
export type SubSupToken = SubToken | SupToken;
