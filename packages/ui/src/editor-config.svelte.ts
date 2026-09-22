import type { Component } from 'svelte';

type EditorProps = Record<string, unknown>;

let registeredEditor: Component<EditorProps> | undefined = $state(undefined);

/**
 * Register a global Rich Text Editor component.
 * This decouples @svadmin/ui from @svadmin/editor, making the editor completely optional.
 * 
 * Usage:
 * ```ts
 * import { Editor } from '@svadmin/editor';
 * import { setRichTextEditor } from '@svadmin/ui';
 * 
 * setRichTextEditor(Editor);
 * ```
 */
export function setRichTextEditor(editorComponent: Component<EditorProps>): void {
  registeredEditor = editorComponent;
}

export function getRichTextEditor(): Component<EditorProps> | undefined {
  return registeredEditor;
}
