<script lang="ts">
	import {
		arrow,
		autoUpdate,
		computePosition,
		flip,
		hide,
		limitShift,
		offset,
		shift,
		type Boundary,
		type Padding,
		type Placement,
		type ReferenceElement,
		type Strategy,
	} from "@floating-ui/dom";
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import { onDestroy, type ComponentProps, type Snippet } from "svelte";
	import { createAttachmentKey } from "svelte/attachments";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "../../../utils.js";
	import { getTooltipLayerContext } from "./tooltip-context.svelte.js";
	import {
		registerTooltipLayer,
		type TooltipLayerBehavior,
	} from "./tooltip-layer-registry.svelte.js";
	import TooltipPortal from "./tooltip-portal.svelte";
	import type { WithoutChildrenOrChild } from "../../../utils.js";

	type Side = "top" | "right" | "bottom" | "left";
	type Align = "start" | "center" | "end";
	type OutsideBehavior = TooltipLayerBehavior;
	type EscapeBehavior = TooltipLayerBehavior;
	type ContentPointerHandler = NonNullable<HTMLAttributes<HTMLDivElement>["onpointerenter"]>;
	type ContentPointerEvent = Parameters<ContentPointerHandler>[0];
	type TooltipContentChildProps = {
		props: Record<PropertyKey, unknown>;
		wrapperProps: Record<string, unknown>;
		open: boolean;
	};
	type TooltipContentProps = Omit<
		HTMLAttributes<HTMLDivElement>,
		"children" | "class" | "id" | "style"
	> & {
		ref?: HTMLDivElement | null;
		class?: string;
		id?: string;
		style?: TooltipPrimitive.ContentProps["style"];
		dir?: TooltipPrimitive.ContentProps["dir"];
		side?: Side;
		sideOffset?: number;
		align?: Align;
		alignOffset?: number;
		arrowPadding?: Padding;
		avoidCollisions?: boolean;
		collisionBoundary?: Boundary;
		collisionPadding?: Padding;
		customAnchor?: ReferenceElement | string | null;
		sticky?: "partial" | "always";
		strategy?: Strategy;
		updatePositionStrategy?: "optimized" | "always";
		hideWhenDetached?: boolean;
		forceMount?: boolean;
		onPlaced?: () => void;
		onInteractOutside?: (event: PointerEvent) => void;
		onFocusOutside?: (event: FocusEvent) => void;
		interactOutsideBehavior?: OutsideBehavior;
		onEscapeKeydown?: (event: KeyboardEvent) => void;
		escapeKeydownBehavior?: EscapeBehavior;
		children?: Snippet;
		child?: Snippet<[TooltipContentChildProps]>;
		arrowClasses?: string;
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof TooltipPortal>>;
	};

	let {
		ref = $bindable(null),
		class: className,
		id,
		style,
		dir,
		side = "top",
		sideOffset = 0,
		align = "center",
		alignOffset = 0,
		arrowPadding = 0,
		avoidCollisions = true,
		collisionBoundary,
		collisionPadding = 0,
		customAnchor,
		sticky = "partial",
		strategy = "fixed",
		updatePositionStrategy = "optimized",
		hideWhenDetached = false,
		forceMount = false,
		onPlaced,
		onInteractOutside,
		onFocusOutside,
		interactOutsideBehavior = "close",
		onEscapeKeydown,
		escapeKeydownBehavior = "close",
		onpointerenter,
		onpointerleave,
		children,
		child,
		arrowClasses,
		portalProps,
		...domProps
	}: TooltipContentProps = $props();

	const tooltip = getTooltipLayerContext();
	const unregisterContentId = tooltip.registerContentId(() => id ?? tooltip.defaultContentId);
	let x = $state(-10_000);
	let y = $state(-10_000);
	let resolvedSide = $state<Side>("top");
	let arrowX = $state<number | undefined>();
	let arrowY = $state<number | undefined>();
	let arrowStaticSide = $state<Side>("bottom");
	let referenceHidden = $state(false);
	let positioned = $state(false);
	let arrowRef: HTMLDivElement | null = $state(null);
	let destroyed = false;
	let positionGeneration = 0;
	const contentAttachmentKey = createAttachmentKey();

	const contentId = $derived(id ?? tooltip.defaultContentId);
	const placement = $derived<Placement>(align === "center" ? side : `${side}-${align}`);
	const arrowStyle = $derived(
		[
			arrowX === undefined ? undefined : `left: ${arrowX}px`,
			arrowY === undefined ? undefined : `top: ${arrowY}px`,
			`${arrowStaticSide}: -5px`,
		]
			.filter(Boolean)
			.join("; ")
	);
	const contentClass = $derived(
		cn(
			"animate-in fade-in-0 zoom-in-95 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm bg-primary text-primary-foreground z-50 w-fit max-w-xs",
			className
		)
	);
	function serializeStyle(value: TooltipPrimitive.ContentProps["style"]) {
		if (!value) return "";
		if (typeof value === "string") return value.trim().replace(/;$/, "");
		return Object.entries(value)
			.filter(([, propertyValue]) => propertyValue !== null && propertyValue !== undefined)
			.map(([property, propertyValue]) => {
				const cssProperty = property.startsWith("--")
					? property
					: property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
				return `${cssProperty}: ${String(propertyValue)}`;
			})
			.join("; ");
	}
	const contentStyle = $derived(
		[
			serializeStyle(style),
			`position: ${strategy}`,
			`left: ${x}px`,
			`top: ${y}px`,
			`visibility: ${(tooltip.open || tooltip.presenceStatus === "ending") && positioned && !referenceHidden ? "visible" : "hidden"}`,
			`pointer-events: ${tooltip.open && !tooltip.disableHoverableContent ? "auto" : "none"}`,
		]
			.filter(Boolean)
			.join("; ")
	);

	function attachContent(node: HTMLDivElement) {
		ref = node;
		tooltip.setContentNode(node);
		return () => {
			if (ref === node) ref = null;
			tooltip.setContentNode(null);
		};
	}

	const contentProps = $derived.by(
		() =>
			({
				...domProps,
				[contentAttachmentKey]: attachContent,
				id: contentId,
				role: "tooltip",
				"data-slot": "tooltip-content",
				"data-state": tooltip.open ? "instant-open" : "closed",
				"data-starting-style": tooltip.presenceStatus === "starting" ? "" : undefined,
				"data-ending-style": tooltip.presenceStatus === "ending" ? "" : undefined,
				"data-side": resolvedSide,
				"aria-hidden": !tooltip.open,
				dir,
				style: contentStyle,
				class: contentClass,
				onpointerenter: handlePointerEnter,
				onpointerleave: handlePointerLeave,
			}) satisfies Record<PropertyKey, unknown>
	);
	const wrapperProps = $derived({ style: "display: contents" });

	function getAnchor(): ReferenceElement | null {
		if (typeof customAnchor === "string") return document.querySelector(customAnchor);
		return customAnchor ?? tooltip.trigger;
	}

	function handlePointerEnter(event: ContentPointerEvent) {
		tooltip.cancelScheduledClose();
		onpointerenter?.(event);
	}

	function handlePointerLeave(event: ContentPointerEvent) {
		onpointerleave?.(event);
		if (!event.defaultPrevented) tooltip.scheduleClose();
	}

	$effect(() => {
		const anchor = getAnchor();
		const floating = ref;
		const arrowElement = arrowRef;
		if (!tooltip.open || !anchor || !floating || destroyed) return;

		let active = true;
		positioned = false;
		const update = async () => {
			const generation = ++positionGeneration;
			const result = await computePosition(anchor, floating, {
				placement,
				strategy,
				middleware: [
					offset({ mainAxis: sideOffset, alignmentAxis: alignOffset || undefined }),
					avoidCollisions && flip({ boundary: collisionBoundary, padding: collisionPadding }),
					avoidCollisions &&
						shift({
							boundary: collisionBoundary,
							padding: collisionPadding,
							limiter: sticky === "partial" ? limitShift() : undefined,
						}),
					arrowElement && arrow({ element: arrowElement, padding: arrowPadding }),
					hideWhenDetached && hide({ boundary: collisionBoundary, padding: collisionPadding }),
				],
			});

			if (
				!active ||
				destroyed ||
				generation !== positionGeneration ||
				ref !== floating ||
				!tooltip.open
			) {
				return;
			}

			x = result.x;
			y = result.y;
			resolvedSide = result.placement.split("-")[0] as Side;
			arrowX = result.middlewareData.arrow?.x;
			arrowY = result.middlewareData.arrow?.y;
			arrowStaticSide = {
				top: "bottom",
				right: "left",
				bottom: "top",
				left: "right",
			}[resolvedSide] as Side;
			referenceHidden = Boolean(result.middlewareData.hide?.referenceHidden);
			positioned = true;
			onPlaced?.();
		};

		const stopAutoUpdate = autoUpdate(anchor, floating, () => void update(), {
			animationFrame: updatePositionStrategy === "always",
		});

		return () => {
			active = false;
			positionGeneration += 1;
			stopAutoUpdate();
		};
	});

	$effect(() => {
		const floating = ref;
		if (!tooltip.open || !floating || destroyed) return;

		const ownerDocument = floating.ownerDocument;
		const NodeConstructor = ownerDocument.defaultView?.Node;
		return registerTooltipLayer(ownerDocument, {
			containsTarget: (target) => {
				if (!NodeConstructor || !(target instanceof NodeConstructor)) return false;
				return floating.contains(target) || Boolean(tooltip.trigger?.contains(target));
			},
			getInteractOutsideBehavior: () => interactOutsideBehavior,
			getEscapeKeydownBehavior: () => escapeKeydownBehavior,
			onInteractOutside: (event) => onInteractOutside?.(event),
			onFocusOutside: (event) => onFocusOutside?.(event),
			onEscapeKeydown: (event) => onEscapeKeydown?.(event),
			close: () => tooltip.close(),
		});
	});

	onDestroy(() => {
		destroyed = true;
		positionGeneration += 1;
		unregisterContentId();
		ref = null;
		arrowRef = null;
	});
</script>

{#if tooltip.shouldRender || forceMount}
	<TooltipPortal {...portalProps}>
		{#if child}
			{@render child({ props: contentProps, wrapperProps, open: tooltip.open })}
		{:else}
			<div {...contentProps}>
				{@render children?.()}
				<div
					bind:this={arrowRef}
					aria-hidden="true"
					data-side={resolvedSide}
					style={arrowStyle}
					class={cn("svadmin-tooltip-arrow", arrowClasses)}
				></div>
			</div>
		{/if}
	</TooltipPortal>
{/if}
