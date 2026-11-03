<script lang="ts">
  /**
   * `<Icon name>` renders, in order: a registered component, a sprite symbol, or
   * a remote SVG. Sprite output is server-rendered `<svg><use>`, so SSR and CSP
   * behave like any other inline SVG (no runtime style injection).
   */
  import { resolveIcon, resolveIconSource } from '../icons.js';
  import { cn } from '../utils.js';

  interface Props {
    name: string;
    size?: number | string;
    /** Accessible name; omit for decorative icons. */
    label?: string;
    class?: string;
  }

  let { name, size = 16, label, class: className }: Props = $props();

  const icon = $derived(resolveIcon(name));
  const source = $derived(icon ? undefined : resolveIconSource(name));
  const spriteHref = $derived(source?.type === 'sprite'
    ? `${source.url}#${source.symbolPrefix ?? ''}${name}`
    : undefined);
  const remoteUrl = $derived(source?.type === 'remote-svg'
    ? source.urlTemplate.replace('{name}', encodeURIComponent(name))
    : undefined);
</script>

{#if icon}
  {@const ResolvedIcon = icon}
  <ResolvedIcon {size} class={className} aria-hidden={label ? undefined : 'true'} aria-label={label} />
{:else if spriteHref}
  <svg
    class={cn('inline-block shrink-0', className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : 'true'}
    focusable="false"
  >
    <use href={spriteHref} />
  </svg>
{:else if remoteUrl}
  <img
    class={cn('inline-block shrink-0', className)}
    src={remoteUrl}
    width={size}
    height={size}
    alt={label ?? ''}
    aria-hidden={label ? undefined : 'true'}
    loading="lazy"
    decoding="async"
  />
{/if}