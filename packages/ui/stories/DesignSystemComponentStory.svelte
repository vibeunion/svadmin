<script lang="ts">
	import { Button } from "../src/components/ui/button/index.js";
	import Badge from "../src/components/ui/badge/badge.svelte";
	import Checkbox from "../src/components/ui/checkbox/checkbox.svelte";
	import Input from "../src/components/ui/input/input.svelte";
	import Select from "../src/components/ui/select/select.svelte";
	import * as Tabs from "../src/components/ui/tabs/index.js";
	import * as DropdownMenu from "../src/components/ui/dropdown-menu/index.js";
	import * as Dialog from "../src/components/ui/dialog/index.js";
	import * as Tooltip from "../src/components/ui/tooltip/index.js";
	import * as Table from "../src/components/ui/table/index.js";
	import StatusBadge from "../src/components/content/StatusBadge.svelte";

	type Kind =
		| "button"
		| "input"
		| "select"
		| "checkbox"
		| "tabs"
		| "badge"
		| "menu"
		| "dialog"
		| "tooltip"
		| "table"
		| "status-badge";

	let { kind, theme = "light" }: { kind: Kind; theme?: "light" | "dark" } = $props();
	let dialogOpen = $state(false);
</script>

	<div class="svadmin-component-story" class:dark={theme === "dark"} data-theme="indigo" data-design-theme={theme}>
	{#if kind === "button"}
		<Button>Default</Button>
		<Button variant="outline">Outline</Button>
		<Button size="sm" disabled>Disabled</Button>
	{:else if kind === "input"}
		<Input aria-label="Input" placeholder="Value" />
		<Input aria-label="Compact input" size="compact" value="Ready" />
	{:else if kind === "select"}
		<Select aria-label="Select" size="compact" placeholder="Choose">
			<option value="ready">Ready</option>
			<option value="review">Review</option>
		</Select>
	{:else if kind === "checkbox"}
		<label><Checkbox aria-label="Checkbox" size="compact" /> Enabled</label>
	{:else if kind === "tabs"}
		<Tabs.Root value="overview">
			<Tabs.List aria-label="Tabs">
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="states">States</Tabs.Trigger>
				<Tabs.Trigger value="disabled" disabled>Disabled</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="overview">Overview</Tabs.Content>
			<Tabs.Content value="states">States</Tabs.Content>
		</Tabs.Root>
	{:else if kind === "badge"}
		<Badge variant="subtle-success">Success</Badge>
		<Badge variant="subtle-warning">Warning</Badge>
		<Badge variant="subtle-destructive">Danger</Badge>
	{:else if kind === "menu"}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item>View</DropdownMenu.Item>
				<DropdownMenu.Item disabled>Disabled</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{:else if kind === "dialog"}
		<Dialog.Root bind:open={dialogOpen}>
			<Dialog.Trigger>Open dialog</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Title>Dialog</Dialog.Title>
				<Dialog.Description>Focus restore</Dialog.Description>
				<Dialog.Close>Close</Dialog.Close>
			</Dialog.Content>
		</Dialog.Root>
	{:else if kind === "tooltip"}
		<Tooltip.Root>
			<Tooltip.Trigger>Hover</Tooltip.Trigger>
			<Tooltip.Content>Tooltip</Tooltip.Content>
		</Tooltip.Root>
	{:else if kind === "table"}
		<Table.Root>
			<Table.Header><Table.Row><Table.Head>Component</Table.Head><Table.Head>State</Table.Head></Table.Row></Table.Header>
			<Table.Body><Table.Row><Table.Cell>Table</Table.Cell><Table.Cell>Ready</Table.Cell></Table.Row></Table.Body>
		</Table.Root>
	{:else}
		<StatusBadge status="success" label="Ready" />
		<StatusBadge status="warning" label="Review" />
		<StatusBadge status="danger" label="Blocked" />
	{/if}
</div>

<style>
	.svadmin-component-story {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem;
		color: var(--foreground);
		background: var(--background);
		min-height: 8rem;
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
