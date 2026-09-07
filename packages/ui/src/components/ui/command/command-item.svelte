<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";
	import type { Snippet } from "svelte";

	type Props = Omit<CommandPrimitive.ItemProps, "children" | "forceMount" | "onSelect"> & {
		children?: Snippet;
		alwaysRender?: boolean;
		forceMount?: boolean;
		onSelect?: (value: string) => void;
	};

	let {
		ref = $bindable(null),
		class: className,
		children,
		value = "",
		alwaysRender,
		forceMount,
		onSelect,
		...restProps
	}: Props = $props();

	function handleSelect() {
		onSelect?.(value || ref?.dataset.value || ref?.textContent?.trim() || "");
	}
</script>

<CommandPrimitive.Item
	bind:ref
	data-slot="command-item"
	data-cmdk-item=""
	class={cn("svadmin-command-item", className)}
	{value}
	forceMount={alwaysRender ?? forceMount}
	onSelect={handleSelect}
	{...restProps}
>
	{@render children?.()}
</CommandPrimitive.Item>
