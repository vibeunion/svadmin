<script lang="ts">
  import ImageField from './ImageField.svelte';

  let { value }: { value: string[] | null | undefined } = $props();
</script>

{#if value?.length}
  <div class="field-images">
    {#each value as image, index (index)}
      <ImageField value={image} />
    {/each}
  </div>
{:else}
  <ImageField value={null} />
{/if}

<style>
  .field-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
