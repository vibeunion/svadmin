<script lang="ts">
  import Carousel from "../../src/components/Carousel.svelte";

  let {
    count = 3,
    indicatorType = "dot",
    arrowType = "always",
    onchange,
  }: {
    count?: number;
    indicatorType?: "dot" | "line";
    arrowType?: "always" | "hover" | "never";
    onchange?: (index: number) => void;
  } = $props();
</script>

<Carousel {count} {indicatorType} {arrowType} {onchange}>
  {#snippet children(idx)}
    <div>Slide {idx + 1}</div>
  {/snippet}
</Carousel>
