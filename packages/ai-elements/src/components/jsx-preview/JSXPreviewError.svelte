<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { AlertCircle } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useJSXPreviewContext } from './context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    class?: string;
    children?: Snippet<[Error]>;
  };
  let { class: className = '', children, ...rest }: Props = $props();
  const preview = useJSXPreviewContext();
</script>

{#if preview.error}
  <div {...rest} class={cn('svadmin-ai-jsx-preview__error', className)} role="alert">
    {#if children}{@render children(preview.error)}{:else}<AlertCircle size={15} aria-hidden="true" /><span>{preview.error.message}</span>{/if}
  </div>
{/if}

<style>
  .svadmin-ai-jsx-preview__error { display: flex; align-items: flex-start; gap: .45rem; margin-top: .5rem; padding: .6rem .7rem; border: 1px solid color-mix(in oklch, var(--destructive, currentColor) 45%, transparent); border-radius: min(var(--radius, .5rem), .5rem); background: color-mix(in oklch, var(--destructive, currentColor) 8%, transparent); color: var(--destructive, currentColor); font-size: .78rem; }
</style>
