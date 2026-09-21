<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import type { Snippet } from 'svelte';
  import { contentPageRecipe as contentPage } from '../../recipes.js';
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

  // 保留旧组件对非窄屏/宽屏输入的默认宽度回退。
  const styles = $derived(contentPage({
    width: width === 'narrow' || width === 'wide' ? width : 'default',
  }));
</script>

<div data-svadmin-content-page={pageId} class={styles.root + ' ' + className}>
  {#if title}<ContentPageHeader {title} {...definedOptions({ "eyebrow": eyebrow })} {...definedOptions({ "description": description })} {...definedOptions({ "actions": actions })} />{/if}
  {@render children()}
</div>
