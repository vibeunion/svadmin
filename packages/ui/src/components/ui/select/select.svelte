<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLSelectAttributes } from "svelte/elements";

	// Use HTMLElement instead of HTMLSelectElement to avoid TS error:
	// HTMLSelectElement.remove() returns void, incompatible with HTMLElement's Element return
	type Props = WithElementRef<HTMLSelectAttributes, HTMLElement> & {
		placeholder?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		placeholder,
		children,
		...restProps
	}: Props = $props();
</script>

<select
	bind:this={ref}
	data-slot="select"
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
