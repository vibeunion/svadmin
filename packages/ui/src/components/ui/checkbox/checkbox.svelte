<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "../../../utils.js";
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import type { Snippet } from "svelte";

	export type CheckboxSize = "default" | "compact" | "small" | "mini" | "large";

	let labelId = `svadmin-cb-${Math.random().toString(36).slice(2, 9)}`;

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

	// Computed outside checkboxControl. Inside that snippet, svelte-check treats
	// `children` as CheckboxPrimitive.Root's children snippet, which shadows the label prop.
	const controlClass = $derived(cn("svadmin-checkbox", !children && className));
	const labelledBy = $derived(children && !restProps["aria-label"] ? labelId : undefined);

	function handleCheckedChange(val: boolean | "indeterminate") {
		const isChecked = val === true;
		restProps.onCheckedChange?.(isChecked);
		onChange?.(isChecked);
		onchange?.(isChecked);
	}
</script>

{#snippet checkboxControl()}
	<CheckboxPrimitive.Root
		bind:ref
		data-slot="checkbox"
		data-size={normalizedSize}
		class={controlClass}
		bind:checked
		bind:indeterminate
		aria-labelledby={labelledBy}
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
		<span id={labelId} class="svadmin-checkbox-label">{@render children()}</span>
	</label>
{:else}
	{@render checkboxControl()}
{/if}
