<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { textareaRecipe as uiTextarea } from "../../../recipes.js";

	type TextareaStatus = "success" | "error" | "loading";
	type TextareaState = "default" | "focus" | "selected" | "complete" | "disabled" | "loading" | "success" | "error";

	type Props = WithElementRef<Omit<HTMLTextareaAttributes, "onfocus" | "onblur" | "onselect">> & {
		status?: TextareaStatus | undefined;
		onfocus?: HTMLTextareaAttributes["onfocus"];
		onblur?: HTMLTextareaAttributes["onblur"];
		onselect?: HTMLTextareaAttributes["onselect"];
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		disabled,
		status,
		class: className,
		"aria-invalid": ariaInvalid,
		onfocus,
		onblur,
		onselect,
		...restProps
	}: Props = $props();

	let focused = $state(false);
	let textSelected = $state(false);

	function readSelected(node: EventTarget | null): boolean {
		if (!(node instanceof HTMLTextAreaElement)) return false;
		if (node.selectionStart == null || node.selectionEnd == null) return false;
		return node.selectionStart !== node.selectionEnd;
	}

	const filled = $derived(value != null && String(value).length > 0);

	const inputState = $derived.by((): TextareaState => {
		if (disabled) return "disabled";
		if (status === "loading") return "loading";
		if (status === "error" || ariaInvalid === true || ariaInvalid === "true") return "error";
		if (status === "success") return "success";
		if (focused && textSelected) return "selected";
		if (focused) return "focus";
		if (filled) return "complete";
		return "default";
	});

	function handleFocus(event: FocusEvent & { currentTarget: EventTarget & HTMLTextAreaElement }) {
		focused = true;
		textSelected = readSelected(event.currentTarget);
		onfocus?.(event);
	}

	function handleBlur(event: FocusEvent & { currentTarget: EventTarget & HTMLTextAreaElement }) {
		focused = false;
		textSelected = false;
		onblur?.(event);
	}

	function handleSelect(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) {
		textSelected = readSelected(event.currentTarget);
		onselect?.(event);
	}
</script>

<textarea
	bind:this={ref}
	data-slot="textarea"
	data-input-state={inputState}
	aria-invalid={ariaInvalid}
	aria-busy={inputState === "loading" ? "true" : undefined}
	class={cn(uiTextarea().root, className)}
	{disabled}
	bind:value
	{...restProps}
	onfocus={handleFocus}
	onblur={handleBlur}
	onselect={handleSelect}
></textarea>
