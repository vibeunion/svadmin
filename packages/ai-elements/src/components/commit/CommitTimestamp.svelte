<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { date, locale = 'en', class: className = '', children, ...rest }: { date: Date; locale?: string; class?: string; children?: Snippet<[string]>; [key: string]: unknown } = $props();
  const formatted = $derived(new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round((date.getTime() - Date.now()) / 86_400_000), 'day'));
</script>
<time class={cn('text-xs', className)} datetime={date.toISOString()} {...rest}>{#if children}{@render children(formatted)}{:else}{formatted}{/if}</time>
