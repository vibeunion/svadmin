<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import { FloatingMenuPlugin } from '@tiptap/extension-floating-menu';
  import { PluginKey } from '@tiptap/pm/state';
  import ToolbarButton from './ToolbarButton.svelte';
  import {
    Heading1, Heading2, Heading3,
    List, ListOrdered, ListChecks,
    Quote, Code2, Minus,
  } from '@lucide/svelte';
  import { t } from '@svadmin/core';

  const floatingMenuKey = new PluginKey('svadminFloatingMenu');

  let { editor }: {
    editor: Editor;
  } = $props();

  let menuElement: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!menuElement) return;

    const plugin = FloatingMenuPlugin({
      pluginKey: floatingMenuKey,
      editor,
      element: menuElement,
      shouldShow: ({ editor: _e, state }) => {
        const { selection } = state;
        const { $anchor: anchor, empty } = selection;
        if (!empty) return false;
        const isRootDepth = anchor.depth === 1;
        const isEmptyTextBlock = anchor.parent.isTextblock
          && !anchor.parent.type.spec.code
          && !anchor.parent.textContent;
        return isRootDepth && isEmptyTextBlock;
      },
    });

    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin(floatingMenuKey);
    };
  });
</script>

<div class="svadmin-floating-menu" bind:this={menuElement} style="visibility: hidden;">
  <ToolbarButton title={t('editor.h1')} onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
    <Heading1 />
  </ToolbarButton>
  <ToolbarButton title={t('editor.h2')} onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
    <Heading2 />
  </ToolbarButton>
  <ToolbarButton title={t('editor.h3')} onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
    <Heading3 />
  </ToolbarButton>
  <ToolbarButton title={t('editor.bulletList')} onclick={() => editor.chain().focus().toggleBulletList().run()}>
    <List />
  </ToolbarButton>
  <ToolbarButton title={t('editor.orderedList')} onclick={() => editor.chain().focus().toggleOrderedList().run()}>
    <ListOrdered />
  </ToolbarButton>
  <ToolbarButton title={t('editor.taskList')} onclick={() => editor.chain().focus().toggleTaskList().run()}>
    <ListChecks />
  </ToolbarButton>
  <ToolbarButton title={t('editor.blockquote')} onclick={() => editor.chain().focus().toggleBlockquote().run()}>
    <Quote />
  </ToolbarButton>
  <ToolbarButton title={t('editor.codeBlock')} onclick={() => editor.chain().focus().toggleCodeBlock().run()}>
    <Code2 />
  </ToolbarButton>
  <ToolbarButton title="Divider" onclick={() => editor.chain().focus().setHorizontalRule().run()}>
    <Minus />
  </ToolbarButton>
</div>
