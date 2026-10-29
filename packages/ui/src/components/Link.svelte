<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type LinkStatus = 'default' | 'success' | 'warning' | 'danger';

  let {
    href,
    disabled = false,
    status = 'default',
    class: className,
    children,
    ...rest
  }: HTMLAnchorAttributes & {
    disabled?: boolean;
    status?: LinkStatus;
    children?: Snippet;
  } = $props();
</script>

<a
  {...rest}
  href={disabled ? undefined : href}
  aria-disabled={disabled ? 'true' : undefined}
  data-slot="link"
  data-status={status}
  class={['svadmin-link', className]}
>{@render children?.()}</a>
