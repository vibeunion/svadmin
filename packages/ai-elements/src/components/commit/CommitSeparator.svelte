<script lang="ts">import type { Snippet } from 'svelte'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<span class={className} aria-hidden={children ? undefined : 'true'} {...rest}>{#if children}{@render children()}{:else}&bull;{/if}</span>
