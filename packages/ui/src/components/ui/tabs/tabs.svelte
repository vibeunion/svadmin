<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import {
		setTabsContext,
		type TabsVariant,
		type TabsOrientation,
		type TabsSize,
	} from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		activeTab?: string;
		defaultValue?: string;
		defaultActiveTab?: string;
		type?: TabsVariant;
		variant?: TabsVariant;
		orientation?: TabsOrientation;
		direction?: TabsOrientation;
		size?: TabsSize;
		destroyOnHide?: boolean;
		onValueChange?: (value: string) => void;
		onChange?: (value: string) => void;
		onchange?: (value: string) => void;
	};

	let {
		ref = $bindable(null),
		value = $bindable(""),
		activeTab = $bindable(""),
		defaultValue,
		defaultActiveTab,
		type,
		variant: variantProp,
		orientation = "horizontal",
		direction,
		size = "default",
		destroyOnHide = true,
		onValueChange,
		onChange,
		onchange,
		class: className,
		children,
		...restProps
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	let innerValue = $state(value || activeTab || defaultValue || defaultActiveTab || "");

	$effect(() => {
		if (value && value !== innerValue) {
			innerValue = value;
		} else if (activeTab && activeTab !== innerValue) {
			innerValue = activeTab;
		}
	});

	const resolvedOrientation = $derived(direction ?? orientation);
	const resolvedVariant = $derived(type ?? variantProp ?? "default");

	setTabsContext({
		get value() {
			return innerValue;
		},
		get variant() {
			return resolvedVariant;
		},
		get orientation() {
			return resolvedOrientation;
		},
		get size() {
			return size;
		},
		get destroyOnHide() {
			return destroyOnHide;
		},
		select(nextValue) {
			if (nextValue === innerValue) return;
			innerValue = nextValue;
			value = nextValue;
			activeTab = nextValue;
			onValueChange?.(nextValue);
			onChange?.(nextValue);
			onchange?.(nextValue);
		},
	});
</script>

<div
	bind:this={ref}
	data-slot="tabs"
	data-variant={resolvedVariant}
	data-orientation={resolvedOrientation}
	data-size={size}
	class={cn("svadmin-tabs", className)}
	{...restProps}
>
	{@render children?.()}
</div>
