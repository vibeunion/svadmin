<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<h3 class={cn('m-0 text-sm font-medium', className)} {...rest}>{#if children}{@render children()}{:else}Environment Variables{/if}</h3>
