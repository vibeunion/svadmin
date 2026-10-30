<script lang="ts">
  import type { HTMLFormAttributes } from 'svelte/elements';

  interface Props {
    id: string;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    action?: string;
    method?: HTMLFormAttributes['method'];
    href?: string;
  }

  let {
    id,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    action,
    method = 'POST',
    href,
  }: Props = $props();
</script>

<div class="lite-popconfirm">
  <a class="lite-btn lite-btn-sm" href={`#${id}`}>{title}</a>
  <div class="lite-popconfirm__panel" id={id} role="dialog" aria-label={title}>
    {#if description}<p>{description}</p>{/if}
    <div class="lite-inline-sm">
      {#if action}
        <form {method} {action}>
          <button class="lite-btn lite-btn-primary lite-btn-sm" type="submit">{confirmLabel}</button>
        </form>
      {:else if href}
        <a class="lite-btn lite-btn-primary lite-btn-sm" href={href}>{confirmLabel}</a>
      {/if}
      <a class="lite-btn lite-btn-sm" href="#">{cancelLabel}</a>
    </div>
  </div>
</div>

<style>
  .lite-popconfirm { display: inline-block; position: relative; }
  .lite-popconfirm__panel { display: none; position: absolute; z-index: 30; top: 100%; left: 0; width: 18rem; max-width: calc(100vw - 2rem); margin-top: 6px; padding: 12px; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; box-shadow: 0 10px 28px rgba(29, 33, 41, 0.16); }
  .lite-popconfirm__panel:target { display: block; }
  .lite-popconfirm__panel p { margin: 0 0 8px; color: #4E5969; font-size: 12px; line-height: 1.5; }
</style>
