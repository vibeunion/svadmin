<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { ResponseProps } from '../Response.svelte';

  export type MessageResponseProps = Omit<ResponseProps, 'children' | 'streaming'> & {
    streaming?: boolean;
    isAnimating?: boolean;
    children?: Snippet | string;
  };
</script>

<script lang="ts">
  import Response from '../Response.svelte';
  let {
    content = '',
    text,
    streaming = false,
    isAnimating,
    children,
    class: className = '',
    ...rest
  }: MessageResponseProps = $props();
</script>

{#if typeof children === 'string'}
  <Response {...rest} content={children} streaming={isAnimating ?? streaming} class={className} />
{:else if text ?? content}
  <Response {...rest} content={text ?? content} streaming={isAnimating ?? streaming} class={className} />
{:else if children}
  <div {...rest} class={`svadmin-ai__markdown ${className}`.trim()}>
    {@render children()}
  </div>
{:else}
  <Response {...rest} content="" streaming={isAnimating ?? streaming} class={className} />
{/if}
