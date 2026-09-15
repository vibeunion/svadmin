<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import {
		buttonVariants as resolveButtonVariants,
		type ButtonSize as ButtonSizeValue,
		type ButtonVariant as ButtonVariantValue,
	} from "./button-variants.js";

	export { buttonVariants, type ButtonSize, type ButtonVariant } from "./button-variants.js";

	export type ButtonProps = WithElementRef<
		HTMLButtonAttributes & HTMLAnchorAttributes,
		HTMLButtonElement | HTMLAnchorElement
	> & {
			variant?: ButtonVariantValue;
			size?: ButtonSizeValue;
			disabledReason?: string;
			restrictionClass?: string;
			restrictionStyle?: string;
		};
</script>

<script lang="ts">
	import * as Tooltip from "../tooltip/index.js";

	const uid = $props.id();
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		disabledReason = "",
		restrictionClass,
		restrictionStyle,
		children,
		"aria-describedby": ariaDescribedBy,
		...restProps
	}: ButtonProps = $props();

	const restriction = $derived((disabledReason ?? "").trim());
	const isDisabled = $derived(Boolean(disabled || restriction));
	const restrictionId = `svadmin-button-restriction-${uid}`;
	const describedBy = $derived(
		[ariaDescribedBy, restriction ? restrictionId : ""].filter(Boolean).join(" ") || undefined,
	);

	function restrictionTriggerProps(props: Record<string, unknown>): Record<string, unknown> {
		const next = { ...props };
		delete next['type'];
		delete next['role'];
		delete next['disabled'];
		delete next['href'];
		return next;
	}
</script>

{#snippet control()}
	{#if href}
		<a
			bind:this={ref}
			data-slot="button"
			data-variant={variant}
			data-size={size}
			class={cn(resolveButtonVariants({ variant, size }), className)}
			href={isDisabled ? undefined : href}
			aria-disabled={isDisabled ? true : undefined}
			role={isDisabled ? "link" : undefined}
			tabindex={isDisabled ? -1 : undefined}
			aria-describedby={describedBy}
			{...restProps}
			onclick={(event) => {
				if (isDisabled) {
					event.preventDefault();
					event.stopImmediatePropagation();
					return;
				}
				restProps.onclick?.(event);
			}}
		>
			{@render children?.()}
		</a>
	{:else}
		<button
			bind:this={ref}
			data-slot="button"
			data-variant={variant}
			data-size={size}
			class={cn(resolveButtonVariants({ variant, size }), className)}
			{type}
			disabled={isDisabled}
			aria-describedby={describedBy}
			{...restProps}
		>
			{@render children?.()}
		</button>
	{/if}
{/snippet}

{#if restriction}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@const triggerProps = restrictionTriggerProps(props as Record<string, unknown>)}
				<span
					{...triggerProps}
					data-slot="button-restriction"
					data-disabled-reason={restriction}
					role="group"
					aria-label={restProps["aria-label"]}
					aria-labelledby={restProps["aria-labelledby"]}
					class={restrictionClass}
					style={`display: inline-flex; max-width: 100%; ${restrictionStyle ?? ""}`}
					aria-describedby={[triggerProps["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined}
				>
					{@render control()}
					<span id={restrictionId} class="svadmin-sr-only">{restriction}</span>
				</span>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="top" sideOffset={6}>{restriction}</Tooltip.Content>
	</Tooltip.Root>
{:else}
	{@render control()}
{/if}
