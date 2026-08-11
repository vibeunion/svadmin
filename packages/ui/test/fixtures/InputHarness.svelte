<script lang="ts">
	import Input from "../../src/components/ui/input/input.svelte";

	let {
		mode = "file",
		multiple = false,
	}: {
		mode?: "file" | "text";
		multiple?: boolean;
	} = $props();

	let files = $state<FileList>(new DataTransfer().files);
	let value = $state("initial");
</script>

{#if mode === "file"}
	<Input type="file" {multiple} bind:files aria-label="Attachment" />
	<output data-testid="bound-files">
		{Array.from(files ?? [], (file) => file.name).join(",")}
	</output>
{:else}
	<Input type="text" bind:value aria-label="Text value" />
	<output data-testid="bound-value">{value}</output>
{/if}
