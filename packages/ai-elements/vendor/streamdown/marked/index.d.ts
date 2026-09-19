import { type MarkedToken, type Token, type TokenizerStartFunction, type TokenizerThis, type Tokens, type TokensList } from 'marked';
import { type AlertToken } from './marked-alert.js';
import { type Footnote, type FootnoteRef, type FootnoteToken } from './marked-footnotes.js';
import { type MathToken } from './marked-math.js';
import { type SubSupToken } from './marked-subsup.js';
import { type ListItemToken, type ListToken } from './marked-list.js';
import { type BrToken } from './marked-br.js';
import { type HrToken } from './marked-hr.js';
import { type TableToken, type THead, type TBody, type TFoot, type THeadRow, type TRow, type TH, type TD } from './marked-table.js';
import { type DescriptionDetailToken, type DescriptionListToken, type DescriptionTermToken, type DescriptionToken } from './marked-dl.js';
import { type AlignToken } from './marked-align.js';
import { type CitationToken } from './marked-citations.js';
import { type MdxToken } from './marked-mdx.js';
export type GenericToken = {
    type: string;
    raw: string;
    tokens?: Token[];
} & Record<string, any>;
export type Extension = {
    name: string;
    level: 'block' | 'inline';
    tokenizer: (this: TokenizerThis, src: string, tokens: Token[] | TokensList) => GenericToken | undefined;
    start?: TokenizerStartFunction;
    applyInBlockParsing?: boolean;
};
export type StreamdownToken = Exclude<MarkedToken, Tokens.List | Tokens.ListItem | Tokens.Table> | ListToken | ListItemToken | MathToken | AlertToken | FootnoteToken | SubSupToken | BrToken | HrToken | TableToken | THead | TBody | TFoot | THeadRow | TRow | TH | TD | DescriptionListToken | DescriptionToken | DescriptionDetailToken | DescriptionTermToken | AlignToken | CitationToken | MdxToken;
export type FootnoteState = {
    refs: Map<string, FootnoteRef>;
    footnotes: Map<string, Footnote>;
};
export type { TableToken, THead, TBody, TFoot, THeadRow, TRow, TH, TD } from './marked-table.js';
export declare const lexWithFootnotes: (markdown: string, extensions?: Extension[]) => {
    tokens: StreamdownToken[];
    footnotes: FootnoteState;
};
export declare const lexWithoutFootnotes: (markdown: string, extensions?: Extension[]) => StreamdownToken[];
export declare const lex: (markdown: string, extensions?: Extension[]) => StreamdownToken[];
export declare const parseBlocksWithFootnotes: (markdown: string, extensions?: Extension[]) => {
    blocks: string[];
    footnotes: FootnoteState;
};
export declare const parseBlocksWithoutFootnotes: (markdown: string, extensions?: Extension[]) => string[];
export declare const parseBlocks: (markdown: string, extensions?: Extension[]) => string[];
export type { MathToken, AlertToken, FootnoteToken, SubSupToken, BrToken, HrToken, AlignToken, CitationToken, MdxToken };
