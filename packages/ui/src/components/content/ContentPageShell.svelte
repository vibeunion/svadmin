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
    density?: 'compact' | 'comfortable';
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
    density = 'comfortable',
    class: className = '',
  }: Props = $props();

  // 保留旧组件对非窄屏/宽屏输入的默认宽度回退。
  const resolvedWidth = $derived(width === 'narrow' || width === 'wide' ? width : 'default');
  const styles = $derived(contentPage({
    width: resolvedWidth,
    density,
  }));
</script>

<div
  data-svadmin-content-page={pageId}
  data-svadmin-content-page-width={resolvedWidth}
  data-density={density}
  class={styles.root + ' ' + className}
>
  {#if title}<ContentPageHeader {title} {density} {...definedOptions({ "eyebrow": eyebrow })} {...definedOptions({ "description": description })} {...definedOptions({ "actions": actions })} />{/if}
  {@render children()}
</div>
