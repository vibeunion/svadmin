import Snippet from './Snippet.svelte';
import SnippetAddon from './SnippetAddon.svelte';
import SnippetCopyButton from './SnippetCopyButton.svelte';
import SnippetInput from './SnippetInput.svelte';
import SnippetText from './SnippetText.svelte';

export { Snippet, SnippetAddon, SnippetCopyButton, SnippetInput, SnippetText };
export const Root = Snippet;
export const Addon = SnippetAddon;
export const CopyButton = SnippetCopyButton;
export const Input = SnippetInput;
export const Text = SnippetText;
export default Snippet;
export type { SnippetProps } from './Snippet.svelte';
export type { SnippetCopyButtonProps } from './SnippetCopyButton.svelte';
