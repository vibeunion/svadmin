<script lang="ts">
	import { Button } from "./button/index.js";
	import Badge from "./badge/badge.svelte";
	import Checkbox from "./checkbox/checkbox.svelte";
	import Input from "./input/input.svelte";
	import Select from "./select/select.svelte";
	import * as Tabs from "./tabs/index.js";
	import * as DropdownMenu from "./dropdown-menu/index.js";
	import * as Dialog from "./dialog/index.js";
	import * as Tooltip from "./tooltip/index.js";
	import * as Table from "./table/index.js";
	import StatusBadge from "../content/StatusBadge.svelte";

	let dialogOpen = $state(false);
</script>

<div class="svadmin-design-system-showcase">
	<section aria-labelledby="buttons-heading">
		<h2 id="buttons-heading">Button states / 按钮状态</h2>
		<div class="svadmin-design-system-showcase__row">
			<Button>Default</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="secondary" size="sm">Compact</Button>
			<Button disabled>Disabled</Button>
		</div>
	</section>

	<section aria-labelledby="fields-heading">
		<h2 id="fields-heading">Fields and selection / 字段与选择</h2>
		<div class="svadmin-design-system-showcase__grid">
			<Input aria-label="Default input" placeholder="Default" />
			<Input aria-label="Compact input" size="compact" placeholder="Compact" />
			<Select aria-label="Status" size="compact" placeholder="Choose a status" />
			<label class="svadmin-design-system-showcase__checkbox">
				<Checkbox aria-label="Enabled" size="compact" />
				Enabled
			</label>
		</div>
	</section>

	<section aria-labelledby="status-heading">
		<h2 id="status-heading">Semantic status / 语义状态</h2>
		<div class="svadmin-design-system-showcase__row">
			<Badge variant="subtle-success">Success</Badge>
			<Badge variant="subtle-warning">Warning</Badge>
			<Badge variant="subtle-destructive">Danger</Badge>
			<Badge variant="outline" size="compact">Compact</Badge>
		</div>
	</section>

	<section aria-labelledby="tabs-heading">
		<h2 id="tabs-heading">Tabs interaction / 标签页交互</h2>
		<Tabs.Root value="overview">
			<Tabs.List aria-label="Design system sections">
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="states">States</Tabs.Trigger>
				<Tabs.Trigger value="disabled" disabled>Disabled</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="overview">Overview content</Tabs.Content>
			<Tabs.Content value="states">State content</Tabs.Content>
		</Tabs.Root>
	</section>

	<section aria-labelledby="overlay-heading">
		<h2 id="overlay-heading">Menus and overlays / 菜单与浮层</h2>
		<div class="svadmin-design-system-showcase__row">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="svadmin-design-system-showcase__trigger">Menu</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>View details</DropdownMenu.Item>
					<DropdownMenu.Item disabled>Disabled action</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<Dialog.Root bind:open={dialogOpen}>
				<Dialog.Trigger class="svadmin-design-system-showcase__trigger">Open dialog</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Component dialog</Dialog.Title>
						<Dialog.Description>Dialog focus and close behavior.</Dialog.Description>
					</Dialog.Header>
					<Dialog.Footer>
						<Dialog.Close class="svadmin-design-system-showcase__trigger">Close</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
			<Tooltip.Root>
				<Tooltip.Trigger class="svadmin-design-system-showcase__trigger">Hover hint</Tooltip.Trigger>
				<Tooltip.Content>Tooltip content</Tooltip.Content>
			</Tooltip.Root>
		</div>
	</section>

	<section aria-labelledby="table-heading">
		<h2 id="table-heading">Table and status / 表格与状态</h2>
		<div class="svadmin-design-system-showcase__row">
			<StatusBadge status="success" label="Ready" />
			<StatusBadge status="warning" label="Review" />
			<StatusBadge status="danger" label="Blocked" />
		</div>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Component</Table.Head>
					<Table.Head>State</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				<Table.Row>
					<Table.Cell>Table</Table.Cell>
					<Table.Cell>Ready</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table.Root>
	</section>
</div>

<style>
	.svadmin-design-system-showcase {
		display: grid;
		gap: 1.5rem;
		max-width: 64rem;
		padding: 1.5rem;
		color: var(--foreground);
		background: var(--background);
	}

	.svadmin-design-system-showcase section {
		display: grid;
		gap: 0.75rem;
	}

	.svadmin-design-system-showcase h2 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.svadmin-design-system-showcase__row,
	.svadmin-design-system-showcase__grid {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.svadmin-design-system-showcase__grid > :global(*) {
		min-width: 12rem;
		flex: 1 1 12rem;
	}

	.svadmin-design-system-showcase__checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	:global(.svadmin-design-system-showcase__trigger) {
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background: var(--background);
		padding: 0.375rem 0.625rem;
		color: var(--foreground);
	}
</style>
