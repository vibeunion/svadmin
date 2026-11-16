<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { CircleX } from "@lucide/svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { textareaRecipe as uiTextarea } from "../../../recipes.js";

	type TextareaStatus = "success" | "error" | "loading";
	type TextareaState = "default" | "focus" | "selected" | "complete" | "disabled" | "loading" | "success" | "error";

	type Props = WithElementRef<Omit<HTMLTextareaAttributes, "onfocus" | "onblur" | "onselect">> & {
		status?: TextareaStatus | undefined;
		maxLength?: number | undefined;
		showWordLimit?: boolean | undefined;
		allowClear?: boolean | undefined;
		onfocus?: HTMLTextareaAttributes["onfocus"];
		onblur?: HTMLTextareaAttributes["onblur"];
		onselect?: HTMLTextareaAttributes["onselect"];
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		disabled,
		status,
		maxLength,
		showWordLimit = false,
		allowClear = false,
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

	const stringValue = $derived(value != null ? String(value) : "");
	const filled = $derived(stringValue.length > 0);
	const charCount = $derived(stringValue.length);

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

	function clearTextarea() {
		if (disabled) return;
		value = "";
	}

	const hasWrapper = $derived(Boolean(showWordLimit || allowClear));
</script>

{#snippet textareaElement()}
	<textarea
		bind:this={ref}
		data-slot="textarea"
		data-input-state={inputState}
		aria-invalid={ariaInvalid}
		aria-busy={inputState === "loading" ? "true" : undefined}
		class={cn(uiTextarea().root, hasWrapper && "w-full border-0 shadow-none bg-transparent resize-y", className)}
		{disabled}
		maxlength={maxLength}
		bind:value
		{...restProps}
		onfocus={handleFocus}
		onblur={handleBlur}
		onselect={handleSelect}
	></textarea>
{/snippet}

{#if hasWrapper}
	<div
		class={cn("svadmin-textarea-wrapper", className)}
		data-slot="textarea-wrapper"
		data-input-state={inputState}
	>
		{@render textareaElement()}
		{#if allowClear && filled && !disabled}
			<button
				type="button"
				class="svadmin-textarea-clear"
				aria-label="Clear textarea"
				onclick={clearTextarea}
			>
				<CircleX size={12} aria-hidden="true" />
			</button>
		{/if}
		{#if showWordLimit}
			<span
				class="svadmin-textarea-word-limit"
				data-slot="textarea-word-limit"
				data-limit-state={maxLength !== undefined && charCount >= maxLength ? "error" : undefined}
			>
				{charCount}{maxLength !== undefined ? ` / ${maxLength}` : ""}
			</span>
		{/if}
	</div>
{:else}
	{@render textareaElement()}
{/if}
