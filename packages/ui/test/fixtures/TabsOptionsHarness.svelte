<script lang="ts">
	import * as Tabs from '../../src/components/ui/tabs/index.js';

	let activeTab = $state('tab1');
	let changes = $state<string[]>([]);
</script>

<Tabs.Root
	bind:activeTab
	direction="vertical"
	size="small"
	destroyOnHide={false}
	onChange={(next) => (changes = [...changes, next])}
>
	<Tabs.List aria-label="Enterprise tabs">
		<Tabs.Trigger value="tab1">First</Tabs.Trigger>
		<Tabs.Trigger value="tab2">Second</Tabs.Trigger>
		<Tabs.Trigger value="tab3" disabled>Disabled</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="tab1">First content</Tabs.Content>
	<Tabs.Content value="tab2">Second content</Tabs.Content>
	<Tabs.Content value="tab3">Disabled content</Tabs.Content>
</Tabs.Root>

<output data-testid="active-tab">{activeTab}</output>
<output data-testid="active-changes">{changes.join(',')}</output>
