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
		class={cn(
			"dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-9 rounded-lg border bg-transparent p-1 pr-3 text-xs md:text-sm text-muted-foreground transition-colors file:mr-3 file:inline-flex file:h-7 file:cursor-pointer file:items-center file:rounded-md file:border file:border-border/60 file:bg-muted file:px-2.5 file:text-xs file:font-medium file:text-foreground file:transition-colors hover:file:bg-muted/80 focus-visible:ring-3 aria-invalid:ring-3 placeholder:text-muted-foreground w-full min-w-0 outline-none cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
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
			"dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-9 rounded-lg border bg-transparent px-3 py-1.5 text-base transition-colors focus-visible:ring-3 aria-invalid:ring-3 md:text-sm placeholder:text-muted-foreground w-full min-w-0 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
