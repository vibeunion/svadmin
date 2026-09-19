import { type StreamdownToken } from './marked/index.js';
type $$ComponentProps = {
    block: string;
    static?: boolean;
    tokens?: StreamdownToken[];
    parseIncompleteMarkdown?: boolean;
    isIncomplete?: boolean;
};
declare const Block: import("svelte").Component<$$ComponentProps, {}, "">;
type Block = ReturnType<typeof Block>;
export default Block;
