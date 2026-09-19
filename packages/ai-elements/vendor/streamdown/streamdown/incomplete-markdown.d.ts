import { IncompleteMarkdownParser, type RemendOptions } from '../remend.js';
export declare const createStreamdownIncompleteMarkdownParser: (options?: RemendOptions) => IncompleteMarkdownParser;
export declare const repairIncompleteMarkdown: (text: string, options?: RemendOptions) => string;
export declare const parseStreamdownIncompleteMarkdown: (text: string, options?: RemendOptions) => string;
export declare const repairStreamdownRenderedMarkdown: (text: string, options?: RemendOptions) => string;
