<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { alertVariants as resolveAlertVariants, type AlertVariant as AlertVariantValue } from "./alert-variants.js";

	export { alertVariants, type AlertVariant } from "./alert-variants.js";
</script>

<script lang="ts">
	import X from "@lucide/svelte/icons/x";
	import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariantValue;
		closable?: boolean;
		closeLabel?: string;
		title?: string;
		showIcon?: boolean;
		banner?: boolean;
		action?: Snippet;
		icon?: Snippet;
		onclose?: (event: MouseEvent) => void;
		children?: Snippet;
	};

	let {
		ref = $bindable(null),
		variant = "default",
		closable = false,
		closeLabel = "Dismiss alert",
		title,
		showIcon = false,
		banner = false,
		action,
		icon,
		onclose,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const statusIcons = {
		default: Info,
		destructive: CircleAlert,
		warning: TriangleAlert,
		success: CheckCircle2,
	} as const;

	const IconComponent = $derived(statusIcons[variant] ?? Info);
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	data-feedback="static"
	data-variant={variant}
	data-closable={closable || undefined}
	class={cn(
		resolveAlertVariants({ variant }),
		banner && "svadmin-alert--banner rounded-none border-x-0 border-t-0 border-b border-border",
		className
	)}
	{...restProps}
>
	{#if icon}
		{@render icon()}
	{:else if showIcon}
		<IconComponent class="svadmin-alert__icon" aria-hidden="true" />
	{/if}

	{#if title}
		<div data-slot="alert-title" class="svadmin-alert-title font-semibold">{title}</div>
	{/if}

	{@render children?.()}

	{#if action}
		<div class="svadmin-alert__action shrink-0 justify-self-end">
			{@render action()}
		</div>
	{/if}

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
	.svadmin-alert__close:focus-visible { outline: var(--svadmin-focus-width) solid var(--ring); outline-offset: var(--svadmin-focus-offset); }
</style>
