<script lang="ts">
  import type { Snippet } from 'svelte';
  import ContentPageHeader from './ContentPageHeader.svelte';

  interface Props {
    title?: string;
    eyebrow?: string;
    description?: string;
    actions?: Snippet;
    children: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
    class?: string;
  }

  let {
    title,
    eyebrow,
    description,
    actions,
    children,
    pageId = 'content',
    width = 'default',
    class: className = '',
  }: Props = $props();

  const widthClass = $derived(
    width === 'narrow'
      ? 'max-w-3xl'
      : width === 'wide'
        ? 'max-w-[92rem]'
        : 'max-w-[74rem]',
  );
</script>

<div data-svadmin-content-page={pageId} class={'mx-auto w-full ' + widthClass + ' space-y-6 ' + className}>
  {#if title}<ContentPageHeader {title} {eyebrow} {description} {actions} />{/if}
  {@render children()}
</div>
