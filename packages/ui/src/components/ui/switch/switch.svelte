<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		disabled?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	};

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		disabled = false,
		onCheckedChange,
		class: className,
		...restProps
	}: Props = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked}
	data-state={checked ? "checked" : "unchecked"}
	data-slot="switch"
	{disabled}
	class={cn("svadmin-switch", className)}
	onclick={toggle}
	{...restProps}
>
	<span
		class="svadmin-switch-thumb"
	></span>
</button>
