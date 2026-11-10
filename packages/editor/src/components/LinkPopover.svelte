<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import { ExternalLink, Unlink, Check } from '@lucide/svelte';
  import { t } from '@svadmin/core';

  let { editor, onclose }: {
    editor: Editor;
    onclose?: () => void;
  } = $props();

  let url = $state('');
  let openInNewTab = $state(true);

  // Initialize from current link
  $effect(() => {
    const attrs = editor.getAttributes('link');
    url = (attrs.href as string) ?? '';
    openInNewTab = attrs.target === '_blank';
  });

  function applyLink() {
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({
        href: url,
        target: openInNewTab ? '_blank' : null,
      }).run();
    }
    onclose?.();
  }

  function removeLink() {
    editor.chain().focus().unsetLink().run();
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyLink();
    }
    if (e.key === 'Escape') {
      onclose?.();
    }
  }
</script>

<div class="svadmin-link-popover">
  <input
    class="svadmin-link-input"
    type="url"
    placeholder={t('editor.link.url')}
    bind:value={url}
    onkeydown={handleKeydown}
  />

  <button
    type="button"
    class="svadmin-toolbar-btn"
    title={t('editor.link.openInNewTab')}
    data-active={openInNewTab}
    onclick={() => { openInNewTab = !openInNewTab; }}
  >
    <ExternalLink />
  </button>

  <button
    type="button"
    class="svadmin-toolbar-btn"
    title={t('editor.link.apply')}
    onclick={applyLink}
  >
    <Check />
  </button>

  {#if editor.isActive('link')}
    <button
      type="button"
      class="svadmin-toolbar-btn"
      title={t('editor.link.remove')}
      onclick={removeLink}
    >
      <Unlink />
    </button>
  {/if}
</div>
