<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	};

	let {
		ref = $bindable(null),
		class: className,
		checked = false,
		onCheckedChange,
		children,
		...restProps
	}: Props = $props();

	function handleClick() {
		const next = !checked;
		onCheckedChange?.(next);
	}
</script>

<button
	bind:this={ref}
	role="menuitemcheckbox"
	aria-checked={checked}
	data-slot="dropdown-menu-checkbox-item"
	class={cn("svadmin-dropdown-checkbox-item", className)}
	onclick={handleClick}
	{...restProps}
>
	<span class="svadmin-dropdown-checkbox-indicator">
		{#if checked}
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
		{/if}
	</span>
	{@render children?.()}
</button>
