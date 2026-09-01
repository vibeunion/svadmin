<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import CodeBlock from '../code-block/CodeBlock.svelte';
  let { schema, title = 'Output Schema', class: className = '', children, ...rest }: { schema: string; title?: string; class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('space-y-2', className)} {...rest}>
  <span class="text-sm font-medium text-muted-foreground">{title}</span>
  {#if children}{@render children()}{:else}<CodeBlock code={schema} language="typescript" />{/if}
</div>
