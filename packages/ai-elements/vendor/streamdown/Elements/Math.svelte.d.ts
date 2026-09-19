import type { MathToken } from '../marked/index.js';
import 'katex/dist/katex.min.css';
type $$ComponentProps = {
    token: MathToken;
    id: string;
};
declare const Math: import("svelte").Component<$$ComponentProps, {}, "">;
type Math = ReturnType<typeof Math>;
export default Math;
