<script lang="ts">
  import Timeline, { type TimelineEntry } from "../../src/components/Timeline.svelte";

  const items: TimelineEntry[] = [
    { id: "1", title: "自定义节点", time: "10:00" },
  ];
</script>

<Timeline {items}>
  {#snippet dot()}
    <span data-testid="star-dot">★</span>
  {/snippet}
</Timeline>
