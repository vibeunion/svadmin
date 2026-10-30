<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { alertVariants as resolveAlertVariants, type AlertVariant as AlertVariantValue } from "./alert-variants.js";

	export { alertVariants, type AlertVariant } from "./alert-variants.js";
</script>

<script lang="ts">
	import X from "@lucide/svelte/icons/x";
	import type { Snippet } from "svelte";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariantValue;
		closable?: boolean;
		closeLabel?: string;
		onclose?: (event: MouseEvent) => void;
		children?: Snippet;
	};

	let {
		ref = $bindable(null),
		variant = "default",
		closable = false,
		closeLabel = "Dismiss alert",
		onclose,
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	data-variant={variant}
	data-closable={closable || undefined}
	class={cn(resolveAlertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
	{#if closable}
		<button type="button" class="svadmin-alert__close" aria-label={closeLabel} onclick={(event) => onclose?.(event)}>
			<X size={14} aria-hidden="true" />
		</button>
	{/if}
</div>

<style>
	[data-closable] {
		position: relative;
		padding-inline-end: 2.5rem;
	}
	.svadmin-alert__close {
		position: absolute;
		inset-block-start: 0.5rem;
		inset-inline-end: 0.5rem;
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.svadmin-alert__close:hover { background: var(--muted); color: var(--foreground); }
	.svadmin-alert__close:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
</style>
