<script lang="ts">
	import { untrack } from "svelte";
	import { createI18nScope, provideI18nScope } from "@svadmin/core/i18n";
	import Input from "../../src/components/ui/input/input.svelte";

	let {
		mode = "file",
		multiple = false,
		locale,
		label,
	}: {
		mode?: "file" | "text" | "number" | "date";
		multiple?: boolean;
		locale?: string;
		label?: string;
	} = $props();

	const scope = createI18nScope();
	untrack(() => scope.updateOwner(locale === undefined ? {} : { locale }));
	provideI18nScope(scope);

	let files = $state<FileList>(new DataTransfer().files);
	let value = $state("initial");
	let numericValue = $state<number | null>(42);
</script>

{#if mode === "file"}
	<Input type="file" {multiple} bind:files aria-label={label ?? "Attachment"} />
	<output data-testid="bound-files">
		{Array.from(files ?? [], (file) => file.name).join(",")}
	</output>
{:else if mode === "number"}
	<Input type="number" bind:value={numericValue} aria-label="Numeric value" />
	<output data-testid="bound-number">{numericValue === null ? "empty" : numericValue}</output>
{:else if mode === "date"}
	<Input type="date" aria-label={label ?? "Date"} />
{:else}
	<Input type="text" bind:value aria-label="Text value" />
	<output data-testid="bound-value">{value}</output>
{/if}
