<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { Editor as TiptapEditor } from '@tiptap/core';
  import { fullPreset, minimalPreset, prosePreset, type EditorPresetOptions, type Lowlight } from '../extensions/index.js';
  import type { AnyExtension } from '@tiptap/core';
  import Toolbar from './Toolbar.svelte';
  import BubbleMenuComp from './BubbleMenu.svelte';
  import FloatingMenuComp from './FloatingMenu.svelte';
  import { t } from '@svadmin/core';
  import '../styles/editor.css';

  interface Props {
    /** HTML string content (bindable) */
    value?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the editor is editable */
    editable?: boolean;
    /** Autofocus on mount */
    autofocus?: boolean | 'start' | 'end';
    /** Max character count */
    maxLength?: number;
    /** Show toolbar */
    showToolbar?: boolean;
    /** Show bubble menu on text selection */
    showBubbleMenu?: boolean;
    /** Show floating menu on empty lines */
    showFloatingMenu?: boolean;
    /** Show character count in footer */
    showCharCount?: boolean;
    /** Extension preset */
    preset?: 'full' | 'minimal' | 'prose';
    /** Custom extensions (overrides preset) */
    extensions?: AnyExtension[];
    /** Image upload handler */
    onUpload?: (file: File) => Promise<string>;
    /** Called on every content change */
    onchange?: (html: string) => void;
    /** Additional CSS class for the wrapper */
    class?: string;
    /** Min height for the editor content area */
    minHeight?: string;
    /** Max height for the editor content area */
    maxHeight?: string;
    /** lowlight instance for syntax-highlighted code blocks */
    lowlight?: Lowlight;
  }

  let {
    value = $bindable(''),
    placeholder = t('editor.startWriting'),
    editable = true,
    autofocus = false,
    maxLength = 0,
    showToolbar = true,
    showBubbleMenu = true,
    showFloatingMenu = true,
    showCharCount = true,
    preset = 'full',
    extensions: customExtensions,
    onUpload,
    onchange,
    class: className = '',
    minHeight = '200px',
    maxHeight = '600px',
    lowlight,
  }: Props = $props();

  let editorElement: HTMLDivElement | undefined = $state();
  let editor: TiptapEditor | null = $state(null);

  // Track whether we're updating externally to prevent loops
  let isUpdatingFromExternal = false;
  let isUpdatingFromEditor = false;

  // Build extensions based on preset
  function buildExtensions(): AnyExtension[] {
    if (customExtensions) return customExtensions;

    const opts: EditorPresetOptions = definedOptions({
      placeholder,
      maxLength,
      lowlight,
    });

    switch (preset) {
      case 'minimal': return minimalPreset(opts);
      case 'prose': return prosePreset(opts);
      case 'full':
      default: return fullPreset(opts);
    }
  }

  // Create editor when element is available
  $effect(() => {
    if (!editorElement) return;

    const ext = buildExtensions();

    editor = new TiptapEditor({
      element: editorElement,
      extensions: ext,
      content: value || '',
      editable,
      autofocus,
      editorProps: {
        attributes: {
          class: 'tiptap',
        },
        // Handle image drop
        handleDrop(view, event, slice, moved) {
          if (!moved && event.dataTransfer?.files?.length && onUpload) {
            const files = event.dataTransfer.files;
            for (const file of files) {
              if (file.type.startsWith('image/')) {
                event.preventDefault();
                onUpload(file).then((url) => {
                  if (editor) {
                    const { schema } = editor.state;
                    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                    const imageNode = schema.nodes['image'];
                    if (pos && imageNode) {
                      const node = imageNode.create({ src: url, alt: file.name });
                      const transaction = view.state.tr.insert(pos.pos, node);
                      view.dispatch(transaction);
                    }
                  }
                });
                return true;
              }
            }
          }
          return false;
        },
        // Handle image paste
        handlePaste(view, event) {
          const items = event.clipboardData?.items;
          if (items && onUpload) {
            for (const item of items) {
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  onUpload(file).then((url) => {
                    if (editor) {
                      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
                    }
                  });
                }
                return true;
              }
            }
          }
          return false;
        },
      },
      onUpdate({ editor: e }) {
        if (isUpdatingFromExternal) return;
        isUpdatingFromEditor = true;
        const html = e.getHTML();
        value = html;
        onchange?.(html);
        // Defer reset to allow Svelte to process
        queueMicrotask(() => { isUpdatingFromEditor = false; });
      },
    });

    return () => {
      editor?.destroy();
      editor = null;
    };
  });

  // Sync external value changes into the editor
  $effect(() => {
    if (!editor || isUpdatingFromEditor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      isUpdatingFromExternal = true;
      editor.commands.setContent(value || '', { emitUpdate: false });
      isUpdatingFromExternal = false;
    }
  });

  // Sync editable state
  $effect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  });

  // Character count
  const charCount = $derived.by(() => editor?.storage.characterCount?.characters() ?? 0);
  const wordCount = $derived.by(() => editor?.storage.characterCount?.words() ?? 0);
</script>

<div class="svadmin-editor {className}">
  {#if showToolbar && editor}
    <Toolbar {editor} {...definedOptions({ "onUpload": onUpload })} {preset} />
  {/if}

  <div
    class="svadmin-editor-content"
    style="min-height: {minHeight}; max-height: {maxHeight};"
    bind:this={editorElement}
  ></div>

  {#if editor && showBubbleMenu && preset !== 'minimal'}
    <BubbleMenuComp {editor} />
  {/if}

  {#if editor && showFloatingMenu && preset !== 'minimal'}
    <FloatingMenuComp {editor} />
  {/if}

  {#if showCharCount && editor}
    <div class="svadmin-editor-footer">
      <span>{wordCount} words</span>
      <span>{charCount} characters{maxLength ? ` / ${maxLength}` : ''}</span>
    </div>
  {/if}
</div>
