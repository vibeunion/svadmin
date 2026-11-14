<script
	lang="ts"
	generics="Type extends HTMLInputTypeAttribute | undefined = undefined"
>
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { useTranslation } from "@svadmin/core/i18n";
	import { definedOptions } from "@svadmin/core/options";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { useComponentConfig } from "../../ConfigProvider.svelte";

	type InputValue = Type extends "number" | "range"
		? number | null | undefined
		: string | null | undefined;

	type InputStatus = "success" | "error" | "loading";
	type InputSize = "mini" | "compact" | "sm" | "default" | "lg";
	type InputState = "default" | "focus" | "selected" | "complete" | "disabled" | "loading" | "success" | "error";

	type Props = WithElementRef<Omit<HTMLInputAttributes, "type" | "value" | "size" | "onfocus" | "onblur" | "onselect">> &
			{ size?: InputSize; nativeSize?: number; status?: InputStatus } &
			(Type extends "file"
				? { type: "file"; files?: FileList | undefined; value?: never }
				: { type?: Type; files?: undefined; value?: InputValue });

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		disabled,
		size: sizeProp,
		nativeSize,
		status,
		class: className,
		"data-slot": dataSlot = "input",
		"aria-invalid": ariaInvalid,
		onfocus,
		onblur,
		onselect,
		...restProps
	}: Props = $props();

	const config = useComponentConfig();
	const size = $derived.by(() => {
		const requested = sizeProp ?? (config.density === "compact" || config.componentSize === "sm" ? "compact" : "default");
		return requested === "sm" ? "compact" : requested;
	});

	const i18n = useTranslation();
	const isFileInput = $derived(type?.toLowerCase() === "file");
	const isDateInput = $derived(["date", "datetime-local", "month", "week", "time"].includes(type?.toLowerCase() ?? ""));
	const attributes = $derived(definedOptions({ ...restProps, disabled, size: nativeSize }));
	const selectedFiles = $derived(files ? Array.from(files) : []);
	const selectedFileLabel = $derived.by(() => {
		const firstFile = selectedFiles[0];
		if (firstFile === undefined) return i18n.t("common.noFileChosen");
		if (selectedFiles.length === 1) return firstFile.name;
		return i18n.t("common.filesSelected", { count: selectedFiles.length });
	});

	let focused = $state(false);
	let textSelected = $state(false);

	function readSelected(node: EventTarget | null): boolean {
		if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLTextAreaElement)) return false;
		if (node.selectionStart == null || node.selectionEnd == null) return false;
		return node.selectionStart !== node.selectionEnd;
	}

	const filled = $derived.by(() => {
		if (isFileInput) return selectedFiles.length > 0;
		if (value == null) return false;
		return String(value).length > 0;
	});

	const inputState = $derived.by((): InputState => {
		if (disabled) return "disabled";
		if (status === "loading") return "loading";
		if (status === "error" || ariaInvalid === true || ariaInvalid === "true") return "error";
		if (status === "success") return "success";
		if (focused && textSelected) return "selected";
		if (focused) return "focus";
		if (filled) return "complete";
		return "default";
	});

	function handleFocus(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		focused = true;
		textSelected = readSelected(event.currentTarget);
		onfocus?.(event);
	}

	function handleBlur(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		focused = false;
		textSelected = false;
		onblur?.(event);
	}

	function handleSelect(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		textSelected = readSelected(event.currentTarget);
		onselect?.(event);
	}
</script>

{#if isFileInput}
	<div
		class={cn("svadmin-file-input", className)}
		data-disabled={disabled ? "true" : undefined}
		data-input-state={inputState}
	>
		<input
			bind:this={ref}
			data-slot={dataSlot}
			data-size={size}
			data-input-type="file"
			data-input-state={inputState}
			aria-invalid={ariaInvalid}
			aria-busy={inputState === "loading" ? "true" : undefined}
			class={cn("svadmin-input", className)}
			type="file"
			bind:files
			{...attributes}
			onfocus={handleFocus}
			onblur={handleBlur}
			onselect={handleSelect}
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
		data-size={size}
		data-input-state={inputState}
		aria-invalid={ariaInvalid}
		aria-busy={inputState === "loading" ? "true" : undefined}
		class={cn("svadmin-input", className)}
		{type}
		lang={isDateInput ? i18n.locale : undefined}
		bind:value
		{...attributes}
		onfocus={handleFocus}
		onblur={handleBlur}
		onselect={handleSelect}
	/>
{/if}
