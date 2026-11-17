<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "../../../utils.js";
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';

	export type CheckboxSize = "default" | "compact" | "small" | "mini" | "large";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = "default",
		class: className,
		...restProps
	}: Omit<WithoutChildrenOrChild<CheckboxPrimitive.RootProps>, "size"> & {
		size?: CheckboxSize;
	} = $props();

	const normalizedSize = $derived(
		size === "small" || size === "mini" ? "compact" : size === "large" ? "default" : size
	);
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	data-size={normalizedSize}
	class={cn("svadmin-checkbox", className)}
	bind:checked
	bind:indeterminate
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div
			data-slot="checkbox-indicator"
			class="svadmin-checkbox-indicator"
		>
			{#if checked}
				<CheckIcon  />
			{:else if indeterminate}
				<MinusIcon  />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
