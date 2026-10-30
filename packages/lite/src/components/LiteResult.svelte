<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    status?: 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500';
    title: string;
    description?: string;
    actionHref?: string;
    actionLabel?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
    children?: Snippet;
  }

  let {
    status = 'info',
    title,
    description,
    actionHref,
    actionLabel,
    secondaryHref,
    secondaryLabel,
    children,
  }: Props = $props();

  const icon = $derived(status === 'success' ? '✓' : status === 'error' || status === '500' ? '!' : status === 'warning' ? '!' : status === '404' ? '404' : status === '403' ? '403' : 'i');
</script>

<section class="lite-result" data-status={status} role="status">
  <span class="lite-result__icon" aria-hidden="true">{icon}</span>
  <h2>{title}</h2>
  {#if description}<p>{description}</p>{/if}
  {@render children?.()}
  {#if actionHref || secondaryHref}
    <div class="lite-inline-sm">
      {#if actionHref}<a class="lite-btn lite-btn-primary" href={actionHref}>{actionLabel ?? 'Continue'}</a>{/if}
      {#if secondaryHref}<a class="lite-btn" href={secondaryHref}>{secondaryLabel ?? 'Back'}</a>{/if}
    </div>
  {/if}
</section>

<style>
  .lite-result { display: block; justify-items: center; padding: 48px 24px; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; text-align: center; }
  .lite-result__icon { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 999px; background: #E8F3FF; color: #165DFF; font-size: 24px; font-weight: 700; }
  .lite-result[data-status='success'] .lite-result__icon { background: #E8FFEA; color: #009A29; }
  .lite-result[data-status='error'] .lite-result__icon, .lite-result[data-status='500'] .lite-result__icon { background: #FFECE8; color: #F53F3F; }
  .lite-result[data-status='warning'] .lite-result__icon { background: #FFF7E8; color: #D25F00; }
  .lite-result h2 { margin: 0; color: #1D2129; font-size: 20px; }
  .lite-result p { max-width: 40rem; margin: 0; color: #4E5969; font-size: 14px; line-height: 1.6; }

  .lite-result > * + * { margin-top: 10px; }
</style>
