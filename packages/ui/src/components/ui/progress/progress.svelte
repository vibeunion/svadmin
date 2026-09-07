<script lang="ts">
	import { cn } from "../../../utils.js";

	let { value = 0, max = 100, class: className, ...restProps }:
		{ value?: number; max?: number; class?: string } & Record<string, unknown> = $props();

	const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
	class={cn("svadmin-progress", className)}
	role="progressbar"
	aria-valuenow={value}
	aria-valuemin={0}
	aria-valuemax={max}
	{...restProps}
>
	<div
		class="svadmin-progress-value"
		style="transform: translateX(-{100 - percentage}%)"
	></div>
</div>
