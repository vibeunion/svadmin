<script lang="ts">
	import * as Tabs from '../../src/components/ui/tabs/index.js';

	let value = $state('overview');
</script>

<Tabs.Root bind:value type="card" orientation="vertical">
	<Tabs.List aria-label="Context propagation">
		<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
		<Tabs.Trigger value="details">Details</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="overview">Overview panel</Tabs.Content>
	<Tabs.Content value="details">Details panel</Tabs.Content>
</Tabs.Root>