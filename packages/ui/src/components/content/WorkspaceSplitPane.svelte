<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    primary: Snippet;
    secondary: Snippet;
    secondaryWidth?: string;
    reverse?: boolean;
    class?: string;
  }

  let {
    primary,
    secondary,
    secondaryWidth = '42%',
    reverse = false,
    class: className = '',
  }: Props = $props();
</script>

<div
  class={cn(
    'svadmin-u-f3c543ad5fe9 svadmin-u-7e0b7cdf1a94 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558',
    reverse ? 'svadmin-u-a43c96035e6f' : 'svadmin-u-7d167f503a39',
    className,
  )}
  style:--workspace-split-width={secondaryWidth}
  data-svadmin-workspace-split-pane
  data-reverse={reverse}
>
  <section class={cn('svadmin-u-7e0b7cdf1a94 svadmin-u-8e63407b5ceb', reverse && 'svadmin-u-87faeaaa291e')} data-svadmin-split-primary>{@render primary()}</section>
  <section class={cn('svadmin-u-7e0b7cdf1a94 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-46daeb0b661f svadmin-u-8e63407b5ceb svadmin-u-bb3e95154365 svadmin-u-7d283214b870', reverse && 'svadmin-u-ac7e80a2c2ae svadmin-u-e00052b6f07e svadmin-u-64a6e3fce6e0')} data-svadmin-split-secondary>{@render secondary()}</section>
</div>
