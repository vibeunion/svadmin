<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		disabled?: boolean;
		loading?: boolean;
		size?: "default" | "small";
		onCheckedChange?: (checked: boolean) => void;
	};

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		disabled = false,
		loading = false,
		size = "default",
		onCheckedChange,
		class: className,
		...restProps
	}: Props = $props();

	const inactive = $derived(disabled || loading);

	function toggle() {
		if (inactive) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked}
	aria-busy={loading ? "true" : undefined}
	data-state={checked ? "checked" : "unchecked"}
	data-slot="switch"
	data-size={size}
	data-loading={loading ? "true" : undefined}
	disabled={inactive}
	class={cn("svadmin-switch", className)}
	onclick={toggle}
	{...restProps}
>
	<span
		class="svadmin-switch-thumb"
	></span>
</button>
