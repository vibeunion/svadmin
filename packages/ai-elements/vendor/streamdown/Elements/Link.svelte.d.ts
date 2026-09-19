import type { Tokens } from 'marked';
import type { Snippet } from 'svelte';
type $$ComponentProps = {
    children: Snippet;
    token: Tokens.Link;
    id: string;
};
declare const Link: import("svelte").Component<$$ComponentProps, {}, "">;
type Link = ReturnType<typeof Link>;
export default Link;
