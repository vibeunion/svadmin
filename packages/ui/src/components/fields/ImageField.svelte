<script lang="ts">
  import MediaThumbnail from '../content/MediaThumbnail.svelte';

  interface Props {
    value: string | null | undefined;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    previewable?: boolean;
    class?: string;
  }

  let {
    value,
    alt = '',
    title,
    width = 80,
    height = 80,
    previewable = true,
    class: className = '',
  }: Props = $props();
</script>

{#if value}
  <div style={width && height ? `width: ${width}px; height: ${height}px;` : undefined} class="inline-block shrink-0">
    <MediaThumbnail
      src={value}
      {alt}
      {title}
      size="full"
      fit="cover"
      showOverlay={previewable}
      class={className}
    />
  </div>
{:else}
  <span class="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-lg text-muted-foreground">—</span>
{/if}
