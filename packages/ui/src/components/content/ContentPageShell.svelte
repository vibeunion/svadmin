<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

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
      ? 'svadmin-u-fa3f7111e53b'
      : width === 'wide'
        ? 'max-w-[92rem]'
        : 'max-w-[74rem]',
  );
</script>

<div data-svadmin-content-page={pageId} class={'svadmin-u-0e12dc7de920 svadmin-u-6da6a3c3f741 ' + widthClass + ' svadmin-u-b3542e058833 ' + className}>
  {#if title}<ContentPageHeader {title} {...definedOptions({ "eyebrow": eyebrow })} {...definedOptions({ "description": description })} {...definedOptions({ "actions": actions })} />{/if}  {@render children()}
</div>
