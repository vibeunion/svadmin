<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLSelectAttributes } from "svelte/elements";

	// Use HTMLElement instead of HTMLSelectElement to avoid TS error:
	// HTMLSelectElement.remove() returns void, incompatible with HTMLElement's Element return
	type Props = Omit<WithElementRef<HTMLSelectAttributes, HTMLElement>, "size"> & {
		placeholder?: string;
		size?: "default" | "compact";
	};

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		placeholder,
		size = "default",
		children,
		...restProps
	}: Props = $props();
</script>

<select
	bind:this={ref}
	data-slot="select"
	data-size={size}
	class={cn(
		"svadmin-select",
		className
	)}
	bind:value
	{...restProps}
>
	{#if placeholder}
		<option value="" disabled selected>{placeholder}</option>
	{/if}
	{@render children?.()}
</select>
