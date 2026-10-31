<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    title: string;
    description?: string;
    open?: boolean;
    closeHref?: string;
    children: Snippet;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    id,
    title,
    description,
    open = false,
    closeHref = '#',
    children,
    class: className = '',
  }: Props = $props();
</script>

<div class="lite-detail-drawer {className}" data-open={open || undefined}>
  <a class="lite-btn lite-btn-sm" href={`#${id}`}>Details</a>
  <aside class="lite-detail-drawer__panel" id={id} aria-label={title}>
    <header>
      <h2>{title}</h2>
      <a href={closeHref} aria-label="Close details">×</a>
    </header>
    {#if description}<p class="lite-muted">{description}</p>{/if}
    {@render children()}
  </aside>
</div>

<style>
  .lite-detail-drawer { display: inline-block; }
  .lite-detail-drawer__panel { display: none; position: fixed; z-index: 40; top: 0; right: 0; bottom: 0; width: 28rem; max-width: 100vw; overflow: auto; padding: 20px; border-left: 1px solid #E5E6EB; background: #fff; box-shadow: -12px 0 32px rgba(29, 33, 41, 0.14); }
  .lite-detail-drawer__panel:target, .lite-detail-drawer[data-open] .lite-detail-drawer__panel { display: block; }
  .lite-detail-drawer__panel header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .lite-detail-drawer__panel h2 { margin: 0; color: #1D2129; font-size: 18px; }
  .lite-detail-drawer__panel header a { margin-left: 12px; color: #4E5969; font-size: 24px; line-height: 1; text-decoration: none; }
</style>
