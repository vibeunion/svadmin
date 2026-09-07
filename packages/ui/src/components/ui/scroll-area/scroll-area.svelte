<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "../../../utils.js";

	let { class: className, children, orientation = 'vertical', ...restProps }:
		{ class?: string; children: Snippet; orientation?: 'vertical' | 'horizontal' } & Record<string, unknown> = $props();
</script>

<div
	class={cn("svadmin-scroll-area", className)}
	{...restProps}
>
	<div class={cn(
		"svadmin-scroll-area-viewport",
		orientation === 'horizontal' ? 'svadmin-scroll-area-horizontal' : 'svadmin-scroll-area-vertical'
	)}>
		{@render children()}
	</div>
</div>
