<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { setTabsContext, type TabsVariant, type TabsOrientation } from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		type?: TabsVariant;
		variant?: TabsVariant;
		orientation?: TabsOrientation;
		onValueChange?: (value: string) => void;
	};

	let {
		ref = $bindable(null),
		value = $bindable(""),
		type,
		variant: variantProp,
		orientation = "horizontal",
		onValueChange,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const resolvedVariant = $derived(type ?? variantProp ?? "default");

	setTabsContext({
		get value() {
			return value;
		},
		get variant() {
			return resolvedVariant;
		},
		get orientation() {
			return orientation;
		},
		select(nextValue) {
			if (nextValue === value) return;
			value = nextValue;
			onValueChange?.(nextValue);
		},
	});
</script>

<div
	bind:this={ref}
	data-slot="tabs"
	data-variant={resolvedVariant}
	data-orientation={orientation}
	class={cn("svadmin-tabs", className)}
	{...restProps}
>
	{@render children?.()}
</div>
