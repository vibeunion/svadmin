import type { Extension } from './index.js';
import type { Tokenizer, Tokens } from 'marked';
type variantType = 'note' | 'tip' | 'important' | 'warning' | 'caution';
export declare function createSyntaxPattern(type: variantType): string;
export declare const markedAlert: Extension;
export declare function processAlertToken(token: Tokens.Blockquote, tokenizer: Tokenizer): void;
export type AlertToken = {
    type: 'alert';
    variant: variantType;
    raw: string;
    text: string;
};
export {};
