<script lang="ts">
  import DetailDrawer from "../../src/components/DetailDrawer.svelte";
  import RowActions from "../../src/components/RowActions.svelte";

  let open = $state(false);
  let selected = $state("none");
  const actions = [
    { label: "Inspect", onclick: () => { selected = "inspect"; } },
    { label: "Archive", onclick: () => { selected = "archive"; } },
    { label: "Disabled", disabled: true },
  ];
</script>

<button onclick={() => { open = true; }}>Open drawer</button>
<p data-testid="selected">{selected}</p>
<div data-testid="clipped-table" style="overflow: hidden; height: 44px; width: 240px; position: fixed; right: 8px; bottom: 8px;">
  <RowActions {actions} maxVisible={0} moreLabel="Table actions" />
</div>
<DetailDrawer bind:open title="Containment drawer">
  <div data-testid="drawer-scroll" style="overflow: auto; height: 80px; transform: translateZ(0);">
    <RowActions {actions} maxVisible={0} moreLabel="Drawer actions" />
    <div style="height: 400px;"></div>
  </div>
</DetailDrawer>
