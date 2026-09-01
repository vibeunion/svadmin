<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { ResponseProps } from '../Response.svelte';

  export type MessageResponseProps = Omit<ResponseProps, 'children' | 'streaming'> & {
    streaming?: boolean;
    isAnimating?: boolean;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import Response from '../Response.svelte';
  import { cn } from '../../utils.js';

  let {
    content = '',
    text,
    streaming = false,
    isAnimating,
    class: className = '',
    children,
    ...rest
  }: MessageResponseProps = $props();
</script>

{#if children}
  <div {...rest} class={cn('svadmin-ai__markdown', className)} data-slot="message-response">
    {@render children()}
  </div>
{:else}
  <Response {...rest} content={text ?? content} streaming={isAnimating ?? streaming} class={className} />
{/if}
