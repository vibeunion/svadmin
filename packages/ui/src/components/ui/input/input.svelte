<script
	lang="ts"
	generics="Type extends HTMLInputTypeAttribute | undefined = undefined"
>
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { useTranslation } from "@svadmin/core/i18n";
	import { definedOptions } from "@svadmin/core/options";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { uiInput } from "../../../styled-system/recipes/index.js";

	type InputValue = Type extends "number" | "range"
		? number | null | undefined
		: string | null | undefined;

	type Props = WithElementRef<Omit<HTMLInputAttributes, "type" | "value">> &
			(Type extends "file"
				? { type: "file"; files?: FileList; value?: never }
				: { type?: Type; files?: undefined; value?: InputValue });

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		disabled,
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: Props = $props();

	const styles = uiInput();
	const i18n = useTranslation();
	const isFileInput = $derived(type?.toLowerCase() === "file");
	const isDateInput = $derived(["date", "datetime-local", "month", "week", "time"].includes(type?.toLowerCase() ?? ""));
	const attributes = $derived(definedOptions({ ...restProps, disabled }));
	const selectedFiles = $derived(files ? Array.from(files) : []);
	const selectedFileLabel = $derived.by(() => {
		const firstFile = selectedFiles[0];
		if (firstFile === undefined) return i18n.t("common.noFileChosen");
		if (selectedFiles.length === 1) return firstFile.name;
		return i18n.t("common.filesSelected", { count: selectedFiles.length });
	});
</script>

{#if isFileInput}
	<div
		class={cn("svadmin-file-input", styles.root, className)}
		data-disabled={disabled ? "true" : undefined}
	>
		<input
			bind:this={ref}
			data-slot={dataSlot}
			data-input-type="file"
			class={cn("svadmin-input", styles.control, className)}
			type="file"
			bind:files
			{...attributes}
		/>
		<span class={cn("svadmin-file-input__visual", styles.visual)} aria-hidden="true">
			<span class={cn("svadmin-file-input__button", styles.button)}>{i18n.t("common.chooseFile")}</span>
			<span class={cn("svadmin-file-input__name", styles.name)}>{selectedFileLabel}</span>
		</span>
	</div>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"svadmin-input",
			styles.control,
			className
		)}
			{type}
			lang={isDateInput ? i18n.locale : undefined}
			bind:value
		{...attributes}
	/>
{/if}
