<script module lang="ts">
  import type { Snippet as RenderSnippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type SnippetProps = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    code: string;
    class?: string;
    children?: RenderSnippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { provideSnippetContext } from './context.svelte.js';

  let { code, class: className = '', children, ...rest }: SnippetProps = $props();

  provideSnippetContext({
    get code() { return code; },
  });
</script>

<div
  {...rest}
  class={cn('svadmin-ai svadmin-ai-snippet', className)}
  data-slot="snippet"
  role="group"
>
  {@render children?.()}
</div>

<style>
  .svadmin-ai-snippet {
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: 2.5rem;
    align-items: center;
    overflow: hidden;
    border: 1px solid var(--input, var(--border, currentColor));
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--background, transparent);
    color: var(--foreground, currentColor);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
</style>
