<script lang="ts">
  import DetailDrawer from '../../src/components/DetailDrawer.svelte';

  let outerOpen = $state(false);
  let innerOpen = $state(false);
</script>

<button type="button" onclick={() => { outerOpen = true; }}>Open outer drawer</button>

<DetailDrawer bind:open={outerOpen} title="Outer drawer">
  <button type="button" tabindex="-1">Outer programmatic action</button>
  <button type="button" hidden>Outer hidden action</button>
  <div style="display: none;"><button type="button">Outer CSS hidden action</button></div>
  <div contenteditable="plaintext-only">Outer editable action</div>
  <button type="button">Outer first action</button>
  <button type="button" onclick={() => { innerOpen = true; }}>Open inner drawer</button>
  {#snippet footer()}
    <button type="button">Outer last action</button>
  {/snippet}
</DetailDrawer>

<DetailDrawer bind:open={innerOpen} title="Inner drawer">
  <button type="button" tabindex="-1">Inner programmatic action</button>
  <div contenteditable="true" tabindex="-1">Inner programmatic editor</div>
  <div contenteditable="true">Inner editable action</div>
  <button type="button">Inner first action</button>
  {#snippet footer()}
    <button type="button">Inner last action</button>
  {/snippet}
</DetailDrawer>
