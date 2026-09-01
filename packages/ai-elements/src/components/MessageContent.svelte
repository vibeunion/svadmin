<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type MessageContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../utils.js';

  let { class: className = '', children, ...rest }: MessageContentProps = $props();
</script>

<div
  {...rest}
  class={cn(
    'flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm',
    'group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
    'group-[.is-assistant]:text-foreground',
    className,
  )}
  data-slot="message-content"
>
  {@render children?.()}
</div>
