<script
	lang="ts"
	generics="Type extends HTMLInputTypeAttribute | undefined = undefined"
>
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";

	type InputValue = HTMLInputAttributes["value"];

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type" | "value"> &
			(Type extends "file"
				? { type: "file"; files?: FileList; value?: never }
				: { type?: Type; files?: undefined; value?: InputValue })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: Props = $props();

	const isFileInput = $derived(type?.toLowerCase() === "file");
</script>

{#if isFileInput}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		data-input-type="file"
		class={cn(
			"svadmin-input",
			className
		)}
		type="file"
		bind:files
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"svadmin-input",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
