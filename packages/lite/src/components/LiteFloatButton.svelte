<script lang="ts">
  interface Props {
    href?: string;
    label?: string;
    description?: string;
    icon?: string;
    badge?: string | number;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    target?: string;
    ariaLabel?: string;
  }

  let {
    href,
    label,
    description,
    icon = '+',
    badge,
    position = 'bottom-right',
    target,
    ariaLabel,
  }: Props = $props();
</script>

<div class="lite-float-button" data-position={position}>
  {#if href}
    <a class="lite-float-button__control" href={href} {target} aria-label={ariaLabel ?? label ?? description ?? 'Float button'}>
      <span aria-hidden="true">{icon}</span>
      {#if label || description}<span><strong>{label}</strong>{#if description}<small>{description}</small>{/if}</span>{/if}
      {#if badge !== undefined}<span class="lite-badge lite-badge-danger">{badge}</span>{/if}
    </a>
  {:else}
    <span class="lite-float-button__control" role="note" aria-label={ariaLabel ?? label ?? 'Float button'}>
      <span aria-hidden="true">{icon}</span>
      {#if label}<span><strong>{label}</strong>{#if description}<small>{description}</small>{/if}</span>{/if}
    </span>
  {/if}
</div>

<style>
  .lite-float-button { position: fixed; z-index: 60; }
  .lite-float-button[data-position='bottom-right'] { right: 24px; bottom: 24px; }
  .lite-float-button[data-position='bottom-left'] { left: 24px; bottom: 24px; }
  .lite-float-button[data-position='top-right'] { top: 24px; right: 24px; }
  .lite-float-button[data-position='top-left'] { top: 24px; left: 24px; }
  .lite-float-button__control { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border: 1px solid #E5E6EB; border-radius: 999px; background: #fff; color: #1D2129; box-shadow: 0 6px 20px rgba(29, 33, 41, 0.16); text-decoration: none; }
  .lite-float-button__control:hover { color: #165DFF; text-decoration: none; }
  .lite-float-button__control small { display: block; color: #86909C; font-size: 11px; }

  .lite-float-button__control > * + * { margin-left: 8px; }
</style>
