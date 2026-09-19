import type { Extension } from './index.js';
import type { Token } from 'marked';
export type MdxToken = {
    type: 'mdx';
    raw: string;
    tagName: string;
    attributes: Record<string, any>;
    selfClosing: boolean;
    tokens?: Token[];
    text?: string;
};
export declare const markedMdx: Extension;
