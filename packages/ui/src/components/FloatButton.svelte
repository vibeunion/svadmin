<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    icon?: Snippet;
    label?: string;
    description?: string;
    href?: string;
    target?: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    shape?: 'circle' | 'square';
    type?: 'default' | 'primary';
    badge?: string | number;
    disabled?: boolean;
    ariaLabel?: string;
    class?: string;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    icon,
    label,
    description,
    href,
    target,
    position = 'bottom-right',
    shape = 'circle',
    type = 'default',
    badge,
    disabled = false,
    ariaLabel,
    class: className = '',
    onclick,
  }: Props = $props();

  const classes = $derived(cn(
    'svadmin-float-button',
    shape === 'square' && 'svadmin-float-button--square',
    !label && !description && 'svadmin-float-button--icon-only',
    className,
  ));
</script>

<div class="svadmin-float-button__anchor" data-position={position}>
  <svelte:element
    this={href ? 'a' : 'button'}
    {...(href ? { href, target } : { type: 'button' })}
    class={classes}
    data-type={type}
    aria-label={ariaLabel ?? label ?? description ?? 'Float button'}
    aria-disabled={disabled || undefined}
    disabled={!href && disabled ? true : undefined}
    onclick={(event: MouseEvent) => { if (disabled) { event.preventDefault(); return; } onclick?.(event); }}
  >
    <span class="svadmin-float-button__icon">{#if icon}{@render icon()}{/if}</span>
    {#if label || description}
      <span class="svadmin-float-button__text">
        {#if label}<span class="svadmin-float-button__label">{label}</span>{/if}
        {#if description}<span class="svadmin-float-button__description">{description}</span>{/if}
      </span>
    {/if}
    {#if badge !== undefined}
      <span class="svadmin-float-button__badge" aria-hidden="true">{badge}</span>
    {/if}
  </svelte:element>
</div>

<style>
  .svadmin-float-button__anchor { position: fixed; z-index: 60; }
  .svadmin-float-button__anchor[data-position='bottom-right'] { inset-block-end: 1.5rem; inset-inline-end: 1.5rem; }
  .svadmin-float-button__anchor[data-position='bottom-left'] { inset-block-end: 1.5rem; inset-inline-start: 1.5rem; }
  .svadmin-float-button__anchor[data-position='top-right'] { inset-block-start: 1.5rem; inset-inline-end: 1.5rem; }
  .svadmin-float-button__anchor[data-position='top-left'] { inset-block-start: 1.5rem; inset-inline-start: 1.5rem; }
  .svadmin-float-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--svadmin-space-2);
    min-height: 2.5rem;
    padding: 0 var(--svadmin-space-4);
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--svadmin-shadow-surface);
    font: inherit;
    font-size: var(--svadmin-text-label);
    cursor: pointer;
    transition: background var(--svadmin-motion-fast) var(--svadmin-motion-easing), box-shadow var(--svadmin-motion-fast) var(--svadmin-motion-easing);
  }
  .svadmin-float-button--icon-only { width: 2.75rem; padding: 0; justify-content: center; }
  .svadmin-float-button--square { border-radius: var(--radius-md); }
  .svadmin-float-button[data-type='primary'] { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }
  .svadmin-float-button:hover { background: var(--accent); box-shadow: var(--svadmin-shadow-surface-hover); }
  .svadmin-float-button[data-type='primary']:hover { background: color-mix(in srgb, var(--primary) 88%, black); }
  .svadmin-float-button:focus-visible { outline: 2px solid var(--ring); outline-offset: var(--svadmin-focus-offset); }
  .svadmin-float-button[disabled], .svadmin-float-button[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }
  .svadmin-float-button__icon { display: inline-flex; align-items: center; justify-content: center; }
  .svadmin-float-button__text { display: grid; text-align: start; }
  .svadmin-float-button__label { font-weight: 600; }
  .svadmin-float-button__description { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-float-button__badge {
    position: absolute;
    inset-block-start: -0.35rem;
    inset-inline-end: -0.25rem;
    min-width: 1.1rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    background: var(--destructive);
    color: var(--destructive-foreground);
    font-size: 0.625rem;
    line-height: 1.1rem;
    text-align: center;
  }
  @media (prefers-reduced-motion: reduce) { .svadmin-float-button { transition: none; } }
</style>
