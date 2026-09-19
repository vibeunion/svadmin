<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { uiTextarea } from "../../../styled-system/recipes/index.js";

	type Props = WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...restProps
	}: Props = $props();
</script>

<textarea
	bind:this={ref}
	data-slot="textarea"
	class={cn("svadmin-textarea", uiTextarea(), className)}
	bind:value
	{...restProps}
></textarea>
