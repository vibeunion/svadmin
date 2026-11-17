<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import {
		getTabsContext,
		type TabsSize,
		type TabsVariant,
		type TabsOrientation,
	} from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: TabsVariant;
		orientation?: TabsOrientation;
		size?: TabsSize;
		scrollable?: boolean;
	};

	let {
		ref = $bindable(null),
		variant: variantProp,
		orientation: orientationProp,
		size: sizeProp,
		scrollable = false,
		class: className,
		children,
		...restProps
	}: Props = $props();

	let tabs = $derived.by(() => {
		try {
			return getTabsContext();
		} catch {
			return null;
		}
	});

	const variant = $derived(variantProp ?? tabs?.variant ?? "default");
	const orientation = $derived(orientationProp ?? tabs?.orientation ?? "horizontal");
	const size = $derived(sizeProp ?? tabs?.size ?? "default");
</script>

<div
	bind:this={ref}
	data-slot="tabs-list"
	class={cn(
		"svadmin-tabs-list",
		scrollable && "svadmin-tabs-list--scroll",
		className,
	)}
	role="tablist"
	aria-orientation={orientation}
	data-variant={variant}
	data-orientation={orientation}
	data-size={size}
	{...restProps}
>
	{@render children?.()}
</div>
