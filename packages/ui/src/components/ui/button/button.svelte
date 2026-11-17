<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import {
		buttonVariants as resolveButtonVariants,
		type ButtonSize as ButtonSizeValue,
		type ButtonVariant as ButtonVariantValue,
	} from "./button-variants.js";

	export { buttonVariants, type ButtonSize, type ButtonVariant } from "./button-variants.js";

	export type ButtonShape = "square" | "round" | "circle";
	export type ButtonStatus = "normal" | "warning" | "danger" | "success";
	export type ArcoButtonType = "primary" | "secondary" | "dashed" | "outline" | "text";

	type ButtonElementAttributes = Omit<HTMLButtonAttributes & HTMLAnchorAttributes, "type">;

	export type ButtonProps = WithElementRef<
		ButtonElementAttributes,
		HTMLButtonElement | HTMLAnchorElement
	> & {
			variant?: ButtonVariantValue;
			size?: ButtonSizeValue | "mini" | "small" | "large";
			loading?: boolean;
			shape?: ButtonShape;
			status?: ButtonStatus;
			long?: boolean;
			block?: boolean;
			type?: "button" | "submit" | "reset" | ArcoButtonType;
			disabledReason?: string;
			disabledReasonDisplay?: "tooltip" | "inline";
			disabledReasonSide?: "top" | "bottom" | "left" | "right";
			restrictionClass?: string;
			restrictionStyle?: string;
		};
</script>

<script lang="ts">
	import * as Tooltip from "../tooltip/index.js";
	import { Loader2 } from "@lucide/svelte";
	import { useComponentConfig } from "../../ConfigProvider.svelte";

	const BUTTON_VARIANTS = new Set(["default", "outline", "secondary", "ghost", "destructive", "link", "dashed", "text"]);
	const BUTTON_SIZES = new Set(["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"]);

	const ARCO_SIZE_MAP: Record<string, ButtonSizeValue> = {
		mini: "xs",
		small: "sm",
		large: "lg",
	};

	const ARCO_TYPE_MAP: Record<string, ButtonVariantValue> = {
		primary: "default",
		secondary: "secondary",
		dashed: "dashed",
		outline: "outline",
		text: "text",
	};

	function readButtonVariant(value: unknown): ButtonVariantValue | undefined {
		if (typeof value !== "string") return undefined;
		if (BUTTON_VARIANTS.has(value)) return value as ButtonVariantValue;
		if (value in ARCO_TYPE_MAP) return ARCO_TYPE_MAP[value];
		return undefined;
	}

	function readButtonSize(value: unknown): ButtonSizeValue | undefined {
		if (typeof value !== "string") return undefined;
		if (BUTTON_SIZES.has(value)) return value as ButtonSizeValue;
		if (value in ARCO_SIZE_MAP) return ARCO_SIZE_MAP[value];
		return undefined;
	}

	const uid = $props.id();
	let {
		class: className,
		variant: variantProp,
		size: sizeProp,
		loading = false,
		shape,
		status = "normal",
		long = false,
		block = false,
		ref = $bindable(null),
		href = undefined,
		type: typeProp = "button",
		disabled,
		disabledReason = "",
		disabledReasonDisplay = "tooltip",
		disabledReasonSide = "top",
		restrictionClass,
		restrictionStyle,
		children,
		"aria-describedby": ariaDescribedBy,
		...restProps
	}: ButtonProps = $props();

	const isArcoType = $derived(typeof typeProp === "string" && typeProp in ARCO_TYPE_MAP);
	const typeVariant = $derived(isArcoType ? ARCO_TYPE_MAP[typeProp as string] : undefined);
	const htmlType = $derived(isArcoType ? "button" : (typeProp as "button" | "submit" | "reset"));

	const config = useComponentConfig();
	const buttonDefaults = $derived(config.componentDefaults['Button'] ?? {});
	const baseVariant = $derived(variantProp ?? typeVariant ?? readButtonVariant(buttonDefaults['variant']) ?? "default");
	const variant = $derived(status === "danger" && baseVariant === "default" ? "destructive" : baseVariant);
	const size = $derived(readButtonSize(sizeProp) ?? readButtonSize(buttonDefaults['size']) ?? (config.density === "compact" || config.componentSize === "sm" ? "sm" : config.componentSize === "lg" ? "lg" : "default"));

	const restriction = $derived((disabledReason ?? "").trim());
	const isDisabled = $derived(Boolean(disabled || loading || restriction));
	const restrictionId = `svadmin-button-restriction-${uid}`;
	const describedBy = $derived(
		[ariaDescribedBy, restriction ? restrictionId : ""].filter(Boolean).join(" ") || undefined,
	);

	const isFullWidth = $derived(long || block);
	const shapeClasses = $derived(
		shape === "round"
			? "rounded-full px-4"
			: shape === "circle"
				? "rounded-full p-0 aspect-square justify-center"
				: ""
	);

	const statusClasses = $derived(
		status === "warning"
			? "border-warning text-warning hover:bg-warning/10"
			: status === "success"
				? "border-success text-success hover:bg-success/10"
				: ""
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
			data-shape={shape || undefined}
			data-status={status !== "normal" ? status : undefined}
			data-loading={loading ? "true" : undefined}
			class={cn(
				resolveButtonVariants({ variant, size }),
				isFullWidth && "w-full",
				shapeClasses,
				statusClasses,
				className
			)}
			href={isDisabled ? undefined : href}
			aria-disabled={isDisabled ? true : undefined}
			aria-busy={loading ? true : undefined}
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
			{#if loading}
				<Loader2 class={cn("animate-spin shrink-0", size === "xs" || size === "icon-xs" ? "size-3 mr-1" : "size-3.5 mr-1.5")} aria-hidden="true" />
			{/if}
			{@render children?.()}
		</a>
	{:else}
		<button
			bind:this={ref}
			data-slot="button"
			data-variant={variant}
			data-size={size}
			data-shape={shape || undefined}
			data-status={status !== "normal" ? status : undefined}
			data-loading={loading ? "true" : undefined}
			class={cn(
				resolveButtonVariants({ variant, size }),
				isFullWidth && "w-full",
				shapeClasses,
				statusClasses,
				className
			)}
			type={htmlType}
			disabled={isDisabled}
			aria-busy={loading ? true : undefined}
			aria-describedby={describedBy}
			{...restProps}
		>
			{#if loading}
				<Loader2 class={cn("animate-spin shrink-0", size === "xs" || size === "icon-xs" ? "size-3 mr-1" : "size-3.5 mr-1.5")} aria-hidden="true" />
			{/if}
			{@render children?.()}
		</button>
	{/if}
{/snippet}

{#if restriction && disabledReasonDisplay === "inline"}
	<span
		data-slot="button-restriction"
		data-disabled-reason={restriction}
		role="group"
		aria-label={restProps["aria-label"]}
		aria-labelledby={restProps["aria-labelledby"]}
		aria-describedby={describedBy}
		class={restrictionClass}
		style={`display: inline-flex; flex-direction: column; align-items: flex-start; gap: .375rem; min-width: 0; max-width: 100%; ${restrictionStyle ?? ""}`}
	>
		{@render control()}
		<span id={restrictionId} data-slot="button-restriction-description" style="font-size: .875rem; line-height: 1.4; overflow-wrap: anywhere;">{restriction}</span>
	</span>
{:else if restriction}
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
		<Tooltip.Content side={disabledReasonSide} sideOffset={6}>{restriction}</Tooltip.Content>
	</Tooltip.Root>
{:else}
	{@render control()}
{/if}
