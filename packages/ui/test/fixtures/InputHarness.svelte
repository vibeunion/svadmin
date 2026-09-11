<script lang="ts">
	import Input from "../../src/components/ui/input/input.svelte";

	let {
		mode = "file",
		multiple = false,
	}: {
		mode?: "file" | "text" | "number";
		multiple?: boolean;
	} = $props();

	let files = $state<FileList>(new DataTransfer().files);
	let value = $state("initial");
	let numericValue = $state<number | null>(42);
</script>

{#if mode === "file"}
	<Input type="file" {multiple} bind:files aria-label="Attachment" />
	<output data-testid="bound-files">
		{Array.from(files ?? [], (file) => file.name).join(",")}
	</output>
{:else if mode === "number"}
	<Input type="number" bind:value={numericValue} aria-label="Numeric value" />
	<output data-testid="bound-number">{numericValue === null ? "empty" : numericValue}</output>
{:else}
	<Input type="text" bind:value aria-label="Text value" />
	<output data-testid="bound-value">{value}</output>
{/if}
