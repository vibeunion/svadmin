<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { alertVariants as resolveAlertVariants, type AlertVariant as AlertVariantValue } from "./alert-variants.js";

	export { alertVariants, type AlertVariant } from "./alert-variants.js";
	export type AlertType = "info" | "success" | "warning" | "error" | "normal" | AlertVariantValue;
</script>

<script lang="ts">
	import X from "@lucide/svelte/icons/x";
	import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariantValue;
		type?: AlertType;
		closable?: boolean;
		closeLabel?: string;
		closeText?: string | Snippet;
		title?: string | Snippet;
		content?: string | Snippet;
		showIcon?: boolean;
		banner?: boolean;
		action?: Snippet;
		icon?: Snippet;
		onclose?: (event: MouseEvent) => void;
		children?: Snippet;
	};

	let {
		ref = $bindable(null),
		variant: variantProp,
		type: typeProp,
		closable: closableProp,
		closeLabel = "Dismiss alert",
		closeText,
		title,
		content,
		showIcon = false,
		banner = false,
		action,
		icon,
		onclose,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const closable = $derived(closableProp ?? Boolean(closeText));

	const variant = $derived.by<AlertVariantValue>(() => {
		if (variantProp) return variantProp;
		if (typeProp === "error") return "destructive";
		if (typeProp === "info" || typeProp === "normal") return "default";
		if (typeProp === "success" || typeProp === "warning") return typeProp;
		return (typeProp as AlertVariantValue) ?? "default";
	});

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
		<div data-slot="alert-title" class="svadmin-alert-title font-semibold">
			<!-- string | Snippet 的联合在模板里无法自动收窄，这里显式断言。 -->
			{#if typeof title === "string"}{title}{:else}{@render (title as Snippet)()}{/if}
		</div>
	{/if}

	{#if content}
		<div data-slot="alert-description" class="svadmin-alert-description">
			{#if typeof content === "string"}{content}{:else}{@render (content as Snippet)()}{/if}
		</div>
	{/if}

	{@render children?.()}

	{#if action}
		<div class="svadmin-alert__action shrink-0 justify-self-end">
			{@render action()}
		</div>
	{/if}

	{#if closable}
		<button
			type="button"
			class={cn("svadmin-alert__close", closeText && "svadmin-alert__close--text w-auto h-auto px-1.5 py-0.5 text-xs font-medium")}
			aria-label={closeLabel}
			onclick={(event) => onclose?.(event)}
		>
			{#if closeText}
				{#if typeof closeText === "string"}{closeText}{:else}{@render (closeText as Snippet)()}{/if}
			{:else}
				<X size={14} aria-hidden="true" />
			{/if}
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
