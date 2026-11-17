<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "../../../utils.js";
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import type { Snippet } from "svelte";

	export type CheckboxSize = "default" | "compact" | "small" | "mini" | "large";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		defaultChecked,
		indeterminate = $bindable(false),
		defaultIndeterminate,
		size = "default",
		class: className,
		children,
		onchange,
		onChange,
		...restProps
	}: Omit<WithoutChildrenOrChild<CheckboxPrimitive.RootProps>, "size"> & {
		size?: CheckboxSize;
		defaultChecked?: boolean;
		defaultIndeterminate?: boolean;
		children?: Snippet;
		onchange?: (checked: boolean) => void;
		onChange?: (checked: boolean) => void;
	} = $props();

	let initialized = false;
	$effect(() => {
		if (!initialized) {
			initialized = true;
			if (defaultChecked !== undefined && !checked) checked = defaultChecked;
			if (defaultIndeterminate !== undefined && !indeterminate) indeterminate = defaultIndeterminate;
		}
	});

	const normalizedSize = $derived(
		size === "small" || size === "mini" ? "compact" : size === "large" ? "default" : size
	);

	function handleCheckedChange(val: boolean | "indeterminate") {
		const isChecked = val === true;
		restProps.onCheckedChange?.(val);
		onChange?.(isChecked);
		onchange?.(isChecked);
	}
</script>

{#snippet checkboxControl()}
	<CheckboxPrimitive.Root
		bind:ref
		data-slot="checkbox"
		data-size={normalizedSize}
		class={cn("svadmin-checkbox", !children && className)}
		bind:checked
		bind:indeterminate
		{...restProps}
		onCheckedChange={handleCheckedChange}
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
{/snippet}

{#if children}
	<label class={cn("svadmin-checkbox-wrapper inline-flex items-center gap-2 cursor-pointer select-none text-sm text-foreground", className)}>
		{@render checkboxControl()}
		<span class="svadmin-checkbox-label">{@render children()}</span>
	</label>
{:else}
	{@render checkboxControl()}
{/if}
