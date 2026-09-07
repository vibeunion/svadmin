<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { setTabsContext } from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		onValueChange?: (value: string) => void;
	};

	let {
		ref = $bindable(null),
		value = $bindable(""),
		onValueChange,
		class: className,
		children,
		...restProps
	}: Props = $props();

	setTabsContext({
		get value() {
			return value;
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
	class={cn("svadmin-tabs", className)}
	{...restProps}
>
	{@render children?.()}
</div>
