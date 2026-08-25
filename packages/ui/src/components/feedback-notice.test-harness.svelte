<script lang="ts">
  import FeedbackNotice from './content/FeedbackNotice.svelte';
</script>

{#snippet action()}
  <button type="button">Resolve now</button>
{/snippet}

<FeedbackNotice
  message="3 required fields still need input."
  tone="warning"
  {action}
/>
