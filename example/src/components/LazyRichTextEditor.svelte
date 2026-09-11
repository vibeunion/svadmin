<script module lang="ts">
  import type { ComponentProps } from 'svelte';

  type RichTextEditorModule = typeof import('@svadmin/editor/components/Editor.svelte');
  type RichTextEditorProps = ComponentProps<RichTextEditorModule['default']>;

  let editorPromise: Promise<RichTextEditorModule> | undefined;

  export function loadRichTextEditor(): Promise<RichTextEditorModule> {
    editorPromise ??= import('@svadmin/editor/components/Editor.svelte')
      .catch((error: unknown) => {
        editorPromise = undefined;
        throw error;
      });
    return editorPromise;
  }
</script>

<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  let {
    id,
    value = $bindable(''),
    placeholder,
    editable = true,
    disabled = false,
    autofocus,
    maxLength,
    showToolbar,
    showBubbleMenu,
    showFloatingMenu,
    showCharCount,
    preset,
    extensions,
    onUpload,
    onchange,
    class: className,
    minHeight,
    maxHeight,
    lowlight,
  }: RichTextEditorProps & {
    id?: string;
    disabled?: boolean;
  } = $props();

  const resolvedEditable = $derived(editable && !disabled);
  const editorModulePromise = loadRichTextEditor();
</script>

<div {id} class="contents">
  {#await editorModulePromise}
    <div class="flex min-h-40 items-center justify-center" role="status" aria-live="polite">
      <span class="text-sm text-muted-foreground">Loading editor...</span>
    </div>
  {:then editorModule}
    {@const Editor = editorModule.default}
    <Editor
      bind:value
      {...definedOptions({ "placeholder": placeholder })}
      editable={resolvedEditable}
      {...definedOptions({ "autofocus": autofocus })}
      {...definedOptions({ "maxLength": maxLength })}
      {...definedOptions({
        showToolbar, showBubbleMenu, showFloatingMenu, showCharCount,
        preset, extensions, onUpload, onchange, class: className,
        minHeight, maxHeight, lowlight,
      })}
    />
  {:catch}
    <div class="flex min-h-40 items-center justify-center" role="alert">
      <span class="text-sm text-destructive">Unable to load the rich text editor.</span>
    </div>
  {/await}
</div>
