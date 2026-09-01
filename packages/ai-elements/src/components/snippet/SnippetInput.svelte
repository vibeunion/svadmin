<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useSnippetContext } from './context.svelte.js';

  type Props = Omit<HTMLInputAttributes, 'class' | 'readonly' | 'value'> & { class?: string };
  let { class: className = '', ariaLabel = 'Code snippet', ...rest }: Props & { ariaLabel?: string } = $props();
  const context = useSnippetContext('SnippetInput');
</script>

<input
  {...rest}
  class={cn('svadmin-ai-snippet-input', className)}
  data-slot="snippet-input"
  aria-label={ariaLabel}
  readonly
  value={context.code}
/>

<style>
  .svadmin-ai-snippet-input { min-width: 0; flex: 1; align-self: stretch; border: 0; outline: 0; background: transparent; color: var(--foreground, currentColor); font: inherit; font-size: 0.8125rem; }
  .svadmin-ai-snippet-input:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: -2px; }
</style>
