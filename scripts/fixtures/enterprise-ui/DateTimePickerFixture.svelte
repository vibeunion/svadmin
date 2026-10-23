<script lang="ts">
  import BindingHost from '../../../packages/ui/src/components/date-time-picker-binding.test-host.svelte';
  import DateTimePolicyFixture from './DateTimePolicyFixture.svelte';

  const params = new URLSearchParams(window.location.search);
  const instant = params.get('instant') === '1';
  const policy = params.get('policy') === '1';
</script>

<main data-testid="date-time-fixture">
  {#if policy}
    <DateTimePolicyFixture />
  {:else}
    <BindingHost {instant} />
  {/if}
</main>