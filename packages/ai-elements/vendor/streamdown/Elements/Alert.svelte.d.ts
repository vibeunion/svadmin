import type { AlertToken } from '../marked/index.js';
import type { Snippet } from 'svelte';
type $$ComponentProps = {
    id: string;
    children: Snippet;
    token: AlertToken;
};
declare const Alert: import("svelte").Component<$$ComponentProps, {}, "">;
type Alert = ReturnType<typeof Alert>;
export default Alert;
