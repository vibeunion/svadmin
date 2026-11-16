<script
	lang="ts"
	generics="Type extends HTMLInputTypeAttribute | undefined = undefined"
>
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import type { Snippet } from "svelte";
	import { CircleX } from "@lucide/svelte";
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

	type InputHandlers = {
		onfocus?: HTMLInputAttributes["onfocus"];
		onblur?: HTMLInputAttributes["onblur"];
		onselect?: HTMLInputAttributes["onselect"];
	};

	type Props = WithElementRef<Omit<HTMLInputAttributes, "type" | "value" | "size" | "onfocus" | "onblur" | "onselect">> &
			{
				size?: InputSize;
				nativeSize?: number;
				status?: InputStatus | undefined;
				allowClear?: boolean;
				prefix?: Snippet;
				suffix?: Snippet;
			} &
			InputHandlers &
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
		allowClear = false,
		prefix,
		suffix,
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

	function clearInput() {
		if (disabled) return;
		value = "" as InputValue;
	}

	const hasWrapper = $derived(!isFileInput && Boolean(allowClear || prefix || suffix));
</script>

{#snippet inputElement()}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		data-size={size}
		data-input-state={inputState}
		aria-invalid={ariaInvalid}
		aria-busy={inputState === "loading" ? "true" : undefined}
		class={cn("svadmin-input", hasWrapper && "border-0 shadow-none bg-transparent focus-visible:ring-0 px-0 h-full", className)}
		{type}
		lang={isDateInput ? i18n.locale : undefined}
		bind:value
		{...attributes}
		onfocus={handleFocus}
		onblur={handleBlur}
		onselect={handleSelect}
	/>
{/snippet}

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
{:else if hasWrapper}
	<div
		class={cn(
			"svadmin-input-wrapper relative inline-flex items-center w-full rounded-sm border border-border bg-card px-2.5 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
			size === "compact" || size === "mini" ? "h-7 text-xs" : "h-8 text-sm",
			disabled && "opacity-50 cursor-not-allowed bg-muted",
			className
		)}
		data-slot="input-wrapper"
		data-size={size}
		data-input-state={inputState}
	>
		{#if prefix}
			<span class="svadmin-input-prefix mr-2 text-muted-foreground shrink-0 flex items-center" aria-hidden="true">
				{@render prefix()}
			</span>
		{/if}
		{@render inputElement()}
		{#if allowClear && filled && !disabled}
			<button
				type="button"
				class="svadmin-input-clear text-muted-foreground hover:text-foreground shrink-0 ml-1 p-0.5 rounded-full cursor-pointer outline-none"
				aria-label="Clear input"
				onclick={clearInput}
			>
				<CircleX size={14} aria-hidden="true" />
			</button>
		{/if}
		{#if suffix}
			<span class="svadmin-input-suffix ml-2 text-muted-foreground shrink-0 flex items-center" aria-hidden="true">
				{@render suffix()}
			</span>
		{/if}
	</div>
{:else}
	{@render inputElement()}
{/if}
