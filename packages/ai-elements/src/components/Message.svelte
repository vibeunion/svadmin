<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ChatMessage } from '../contracts.js';

  export type MessageProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    from: ChatMessage['role'];
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../utils.js';

  let {
    from,
    id,
    class: className = '',
    children,
    ...rest
  }: MessageProps = $props();
</script>

<div
  {...rest}
  {id}
  class={cn(
    'group flex w-full max-w-[95%] flex-col gap-2',
    from === 'user' ? 'is-user ml-auto justify-end' : 'is-assistant',
    className,
  )}
  data-message-id={id}
  data-role={from}
>
  {@render children?.()}
</div>
