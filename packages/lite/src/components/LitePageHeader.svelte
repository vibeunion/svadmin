<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let { title, description, eyebrow, actions, children }: Props = $props();
</script>

<header class="lite-page-header lite-page-header-rich">
  <div>
    {#if eyebrow}<p class="lite-page-header__eyebrow">{eyebrow}</p>{/if}
    <h1 class="lite-page-title">{title}</h1>
    {#if description}<p class="lite-page-header__description">{description}</p>{/if}
    {@render children?.()}
  </div>
  {#if actions}<div class="lite-page-header__actions">{@render actions()}</div>{/if}
</header>

<style>
  .lite-page-header-rich { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; }
  .lite-page-header__eyebrow { margin: 0 0 4px; color: #86909C; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .lite-page-header__description { margin: 6px 0 0; color: #4E5969; font-size: 13px; line-height: 1.6; }
  .lite-page-header__actions { display: flex; flex-wrap: wrap; align-items: center; }

  .lite-page-header__actions > * + * { margin-left: 8px; }
</style>
