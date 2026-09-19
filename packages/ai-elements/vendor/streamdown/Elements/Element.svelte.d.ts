import type { Snippet } from 'svelte';
import type { StreamdownToken } from '../marked/index.js';
type $$ComponentProps = {
    token: StreamdownToken;
    children: Snippet;
    isIncomplete?: boolean;
};
declare const Element: import("svelte").Component<$$ComponentProps, {}, "">;
type Element = ReturnType<typeof Element>;
export default Element;
