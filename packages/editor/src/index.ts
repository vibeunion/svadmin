/**
 * @svadmin/editor — Modern Tiptap-based rich text editor for Svelte 5
 *
 * @example
 * ```svelte
 * <script>
 *   import { Editor } from '@svadmin/editor';
 *
 *   let content = $state('<p>Hello World</p>');
 * </script>
 *
 * <Editor bind:value={content} placeholder="Start writing..." />
 * ```
 */

// ─── Main component ──────────────────────────────────────────────
export { default as Editor } from './components/Editor.svelte';

// ─── Sub-components (for custom layouts) ─────────────────────────
export { default as Toolbar } from './components/Toolbar.svelte';
export { default as ToolbarButton } from './components/ToolbarButton.svelte';
export { default as ToolbarGroup } from './components/ToolbarGroup.svelte';
export { default as ToolbarSelect } from './components/ToolbarSelect.svelte';
export { default as BubbleMenu } from './components/BubbleMenu.svelte';
export { default as FloatingMenu } from './components/FloatingMenu.svelte';
export { default as ColorPicker } from './components/ColorPicker.svelte';
export { default as LinkPopover } from './components/LinkPopover.svelte';
export { default as TableMenu } from './components/TableMenu.svelte';
export { default as ImageUpload } from './components/ImageUpload.svelte';

// ─── Extension presets ───────────────────────────────────────────
export {
  fullPreset,
  minimalPreset,
  prosePreset,
  type EditorPresetOptions,
  type Lowlight,
} from './extensions/index.js';

// ─── Individual extensions (re-exports for custom composition) ──
export {
  StarterKit,
  Underline,
  TextAlign,
  TextStyle,
  Color,
  Highlight,
  Link,
  Image,
  Placeholder,
  CharacterCount,
  Typography,
  Subscript,
  Superscript,
  TaskList,
  TaskItem,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  CodeBlockLowlight,
} from './extensions/index.js';

// ─── Tiptap core re-exports (convenience) ────────────────────────
export { Editor as TiptapEditor } from '@tiptap/core';
export type { AnyExtension, Extension, Mark, Node } from '@tiptap/core';
