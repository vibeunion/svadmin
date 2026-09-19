import type { Component, Snippet } from 'svelte';
type $$ComponentProps = {
    children: Snippet;
    render?: Snippet<[any]>;
    component?: Component<any>;
    props: Record<string, any>;
};
declare const Slot: Component<$$ComponentProps, {}, "">;
type Slot = ReturnType<typeof Slot>;
export default Slot;
