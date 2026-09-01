<script lang="ts">
  import { cn } from '../../utils.js'; let { initials, src, alt = '', class: className = '', ...rest }: { initials: string; src?: string; alt?: string; class?: string; [key: string]: unknown } = $props();
</script>
<span class={cn('inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs text-muted-foreground', className)} {...rest}>{#if src}<img class="size-full object-cover" {src} {alt} />{:else}<span aria-label={alt || initials}>{initials}</span>{/if}</span>
