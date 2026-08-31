<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  export type LiteBadgeVariant =
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'subtle'
    | 'subtle-success'
    | 'subtle-warning'
    | 'subtle-destructive'
    | 'subtle-pill'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'info'
    | 'success'
    | 'warning';

  interface Props {
    variant?: LiteBadgeVariant;
    href?: string;
    class?: string;
    children?: import('svelte').Snippet;
  }

  let {
    variant = 'default',
    href,
    class: className = '',
    children,
    ...restProps
  }: Props & HTMLAnchorAttributes = $props();
</script>

<svelte:element
  this={href ? 'a' : 'span'}
  {href}
  class={'lite-badge lite-badge-' + variant + (className ? ' ' + className : '')}
  {...restProps}
>
  {@render children?.()}
</svelte:element>
