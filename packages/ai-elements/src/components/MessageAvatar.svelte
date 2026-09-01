<script lang="ts">
  type Props = { src?: string; alt?: string; fallback?: string; class?: string };
  let { src, alt = 'Avatar', fallback = 'AI', class: className = '' }: Props = $props();
</script>
{#if src}<img class="size-8 rounded-full object-cover {className}" {src} {alt} />{:else}<span class="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold {className}" aria-label={alt}>{fallback}</span>{/if}
