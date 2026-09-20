<script
	lang="ts"
	generics="Type extends HTMLInputTypeAttribute | undefined = undefined"
>
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { useTranslation } from "@svadmin/core/i18n";
	import { definedOptions } from "@svadmin/core/options";
	import { cn, type WithElementRef } from "../../../utils.js";

	type InputValue = Type extends "number" | "range"
		? number | null | undefined
		: string | null | undefined;
	type InputSize = "default" | "compact";

	type Props = WithElementRef<Omit<HTMLInputAttributes, "type" | "value">> &
			(Type extends "file"
				? { type: "file"; files?: FileList; value?: never }
				: { type?: Type; files?: undefined; value?: InputValue });
	type InputProps = Omit<Props, "size" | "data-slot"> & {
		size?: InputSize;
		"data-slot"?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		size = "default",
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: InputProps = $props();

	const i18n = useTranslation();
	const isFileInput = $derived(type?.toLowerCase() === "file");
	const isDateInput = $derived(["date", "datetime-local", "month", "week", "time"].includes(type?.toLowerCase() ?? ""));
	const attributes = $derived(definedOptions(restProps));
	const selectedFiles = $derived(files ? Array.from(files) : []);
	const selectedFileLabel = $derived.by(() => {
		if (selectedFiles.length === 0) return i18n.t("common.noFileChosen");
		if (selectedFiles.length === 1) return selectedFiles[0]!.name;
		return i18n.t("common.filesSelected", { count: selectedFiles.length });
	});
</script>

{#if isFileInput}
	<div
		class={cn("svadmin-file-input", className)}
			data-disabled={restProps.disabled ? "true" : undefined}
	>
		<input
			bind:this={ref}
			data-slot={dataSlot}
			data-input-type="file"
			class={cn("svadmin-input", className)}
			type="file"
			bind:files
			{...attributes}
		/>
		<span class="svadmin-file-input__visual" aria-hidden="true">
			<span class="svadmin-file-input__button">{i18n.t("common.chooseFile")}</span>
			<span class="svadmin-file-input__name">{selectedFileLabel}</span>
		</span>
	</div>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"svadmin-input",
			className
		)}
		data-size={size}
			{type}
			lang={isDateInput ? i18n.locale : undefined}
			bind:value
		{...attributes}
	/>
{/if}
