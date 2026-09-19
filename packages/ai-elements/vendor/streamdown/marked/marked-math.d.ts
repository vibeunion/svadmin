import type { Extension } from './index.js';
export type MarkedMathOptions = {
    singleDollarTextMath?: boolean;
};
export declare const createMarkedMathExtensions: (options?: MarkedMathOptions) => Extension[];
export declare const markedMath: Extension[];
export type MathToken = {
    type: 'math';
    raw: string;
    text: string;
    isInline: boolean;
    displayMode: boolean;
};
