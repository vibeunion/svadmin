<script lang="ts">
  import MediaThumbnail from '../content/MediaThumbnail.svelte';

  interface Props {
    value: string | null | undefined;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    previewable?: boolean;
    emptyLabel?: string;
    class?: string;
  }

  let { value, alt = '', title, width = 80, height = 80, previewable = true, emptyLabel = 'No image', class: className = '' }: Props = $props();
</script>

{#if value}
  <div style={`width: ${width}px; height: ${height}px;`} class="inline-block shrink-0">
    <MediaThumbnail src={value} {alt} {title} size="full" fit="cover" showOverlay={previewable} class={className} />
  </div>
{:else}
  <MediaThumbnail src={null} {emptyLabel} class={className} />
{/if}
