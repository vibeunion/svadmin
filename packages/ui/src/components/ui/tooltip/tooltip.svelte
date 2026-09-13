<script lang="ts" generics="Payload = never">
  import { definedOptions } from '@svadmin/core/options';

	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import { onDestroy } from "svelte";
	import TooltipProvider from "./tooltip-provider.svelte";
	import {
		getTooltipTetherBridge,
		TooltipLayerContext,
		setTooltipLayerContext,
	} from "./tooltip-context.svelte.js";

	const uid = $props.id();
	let {
		open = $bindable(false),
		triggerId = $bindable<string | null>(null),
		disableHoverableContent,
		onOpenChange,
		onOpenChangeComplete,
		tether,
		...restProps
	}: TooltipPrimitive.RootProps<Payload> = $props();
	let observedInitialOpen = false;

	function setOpen(value: boolean) {
		if (open === value) return;
		open = value;
		onOpenChange?.(value);
	}

	const tooltipLayer = new TooltipLayerContext(
		`tooltip-${uid}`,
		() => open,
		setOpen,
		() => disableHoverableContent ?? false,
		() => triggerId,
		(activeTriggerId) =>
			tether ? getTooltipTetherBridge(tether).getTrigger(activeTriggerId) : null,
		() => onOpenChangeComplete
	);
	setTooltipLayerContext(tooltipLayer);

	$effect(() => {
		const currentTether = tether;
		if (!currentTether) return;
		return getTooltipTetherBridge(currentTether).registerLayer(tooltipLayer);
	});

	$effect(() => {
		const currentOpen = open;
		if (!observedInitialOpen) {
			observedInitialOpen = true;
			return;
		}
		tooltipLayer.transitionPresence(currentOpen);
	});

	onDestroy(() => {
		tooltipLayer.destroy();
	});
</script>

<TooltipProvider>
	<TooltipPrimitive.Root
		bind:open
		bind:triggerId
		{...definedOptions({ "disableHoverableContent": disableHoverableContent })}
		{...definedOptions({ "onOpenChange": onOpenChange })}
		{tether}
		{...restProps}
	/>
</TooltipProvider>
