<script lang="ts">
	import { Command } from "../../src/components/ui/command/index.js";

	let { dialog = false }: { dialog?: boolean } = $props();
	let selected = $state("");
	let dialogValue = $state("");
</script>

{#if dialog}
	<Command.Dialog open label="Dialog actions" loop bind:value={dialogValue}>
		<Command.Input placeholder="Search dialog commands…" />
		<Command.List>
			<Command.Loading progress={50}>Loading commands…</Command.Loading>
			<Command.Group heading="Dialog navigation">
				<Command.Item value="dialog-settings" onSelect={(value) => (selected = value)}>
					Dialog settings
				</Command.Item>
			</Command.Group>
			<Command.Separator alwaysRender />
		</Command.List>
	</Command.Dialog>
{:else}
	<Command.Root label="Actions" loop>
		<Command.Input aria-label="Search commands" placeholder="Search commands…" />
		<Command.List>
			<Command.Empty>No commands found.</Command.Empty>
			<Command.Group heading="Navigation">
				<Command.Item value="dashboard" onSelect={(value) => (selected = value)}>
					Dashboard
				</Command.Item>
				<Command.Item value="settings" onSelect={(value) => (selected = value)}>
					Settings
				</Command.Item>
				<Command.Item value="disabled" disabled onSelect={(value) => (selected = value)}>
					Disabled command
				</Command.Item>
			</Command.Group>
		</Command.List>
	</Command.Root>
{/if}

<output data-testid="selected-command">{selected}</output>
<output data-testid="dialog-value">{dialogValue}</output>
