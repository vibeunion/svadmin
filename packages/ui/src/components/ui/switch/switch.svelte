<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";
	import { Loader2 } from "@lucide/svelte";

	type SwitchSize = "default" | "small" | "mini" | "medium" | "large";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		disabled?: boolean;
		loading?: boolean;
		size?: SwitchSize;
		checkedText?: string | Snippet;
		uncheckedText?: string | Snippet;
		checkedIcon?: Snippet;
		uncheckedIcon?: Snippet;
		onCheckedChange?: (checked: boolean) => void;
	};

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		disabled = false,
		loading = false,
		size: sizeProp = "default",
		checkedText,
		uncheckedText,
		checkedIcon,
		uncheckedIcon,
		onCheckedChange,
		class: className,
		...restProps
	}: Props = $props();

	const size = $derived.by(() => {
		if (sizeProp === "small" || sizeProp === "mini") return "small";
		return "default";
	});

	const inactive = $derived(disabled || loading);

	function toggle() {
		if (inactive) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked}
	aria-busy={loading ? "true" : undefined}
	data-state={checked ? "checked" : "unchecked"}
	data-slot="switch"
	data-size={size}
	data-loading={loading ? "true" : undefined}
	disabled={inactive}
	class={cn("svadmin-switch", (checkedText || uncheckedText) && "svadmin-switch--with-text", className)}
	onclick={toggle}
	{...restProps}
>
	{#if checkedText || uncheckedText}
		<span class={cn("svadmin-switch-text text-xs font-medium select-none leading-none", checked ? "pl-2 pr-6 text-primary-foreground" : "pl-6 pr-2 text-muted-foreground")}>
			{#if checked}
				{#if typeof checkedText === "string"}{checkedText}{:else if checkedText}{@render checkedText()}{/if}
			{:else}
				{#if typeof uncheckedText === "string"}{uncheckedText}{:else if uncheckedText}{@render uncheckedText()}{/if}
			{/if}
		</span>
	{/if}
	<span
		class="svadmin-switch-thumb flex items-center justify-center"
	>
		{#if loading}
			<Loader2 class="size-2.5 animate-spin text-muted-foreground" aria-hidden="true" />
		{:else if checked && checkedIcon}
			{@render checkedIcon()}
		{:else if !checked && uncheckedIcon}
			{@render uncheckedIcon()}
		{/if}
	</span>
</button>
