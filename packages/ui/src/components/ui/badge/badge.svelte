<script lang="ts" module>
	import { badgeVariants as resolveBadgeVariants, type BadgeVariant as BadgeVariantValue } from "./badge-variants.js";

	export { badgeVariants, type BadgeVariant } from "./badge-variants.js";
	export type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning' | 'danger' | 'info' | 'primary';
	export type BadgeSize = "default" | "compact" | "small" | "mini" | "large";
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { useComponentConfig } from "../../ConfigProvider.svelte";

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = "default",
		size: sizeProp,
		count,
		overflowCount = 99,
		maxCount,
		dot = false,
		status,
		text,
		offset,
		showZero = false,
		color,
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariantValue;
		size?: BadgeSize;
		count?: number | string | undefined;
		overflowCount?: number | undefined;
		maxCount?: number | undefined;
		dot?: boolean | undefined;
		status?: BadgeStatus | undefined;
		text?: string | undefined;
		offset?: [number, number] | undefined;
		showZero?: boolean | undefined;
		color?: string | undefined;
	} = $props();

	const config = useComponentConfig();
	const size = $derived(sizeProp ?? (config.density === "compact" || config.componentSize === "sm" ? "compact" : "default"));
	const isSmall = $derived(size === 'small' || size === 'compact' || size === 'mini');

	const isStatusMode = $derived(count !== undefined || dot || status !== undefined);

	const effectiveOverflowCount = $derived(maxCount ?? overflowCount);

	const displayCount = $derived.by(() => {
		if (count === undefined) return null;
		if (typeof count === 'number') {
			if (count === 0 && !showZero) return null;
			if (count > effectiveOverflowCount) return `${effectiveOverflowCount}+`;
			return String(count);
		}
		return count;
	});

	const hasBadge = $derived(dot || displayCount !== null);

	const offsetStyle = $derived.by(() => {
		if (!offset) return '';
		const [x, y] = offset;
		return `transform: translate(calc(50% + ${x}px), calc(-50% + ${y}px));`;
	});

	const statusColorClass = $derived.by(() => {
		if (color) return '';
		switch (status) {
			case 'success':
				return 'bg-success';
			case 'processing':
			case 'primary':
			case 'info':
				return 'bg-primary';
			case 'warning':
				return 'bg-warning';
			case 'error':
			case 'danger':
				return 'bg-destructive';
			case 'default':
			default:
				return 'bg-muted-foreground';
		}
	});
</script>

{#if status !== undefined && !children}
	<!-- 独立状态徽标 (Status Badge) -->
	<svelte:element
		this={href ? "a" : "span"}
		bind:this={ref}
		data-svadmin-component="badge"
		data-slot="badge-status"
		data-status={status}
		data-size={size}
		{href}
		class={cn('inline-flex items-center gap-2 text-sm text-foreground', className)}
		{...restProps}
	>
		<span class={cn("relative flex", isSmall ? "h-1.5 w-1.5" : "h-2 w-2")}>
			{#if status === 'processing'}
				<span class={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', statusColorClass)} style={color ? `background-color: ${color}` : undefined}></span>
			{/if}
			<span class={cn('relative inline-flex rounded-full', isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2', statusColorClass)} style={color ? `background-color: ${color}` : undefined}></span>
		</span>
		{#if text}
			<span class="svadmin-badge-status-text select-none text-xs">{text}</span>
		{/if}
	</svelte:element>
{:else if isStatusMode && children}
	<!-- 包裹宿主元素右上角角标 (Wrapped Badge) -->
	<svelte:element
		this={href ? "a" : "span"}
		bind:this={ref}
		data-svadmin-component="badge"
		data-slot="badge-wrapper"
		data-size={size}
		{href}
		class={cn('relative inline-flex shrink-0 align-middle', className)}
		{...restProps}
	>
		{@render children()}
		{#if hasBadge}
			{#if dot}
				<span
					data-slot="badge-dot"
					class={cn(
						'absolute top-0 right-0 z-10 rounded-full ring-2 ring-background transform translate-x-1/2 -translate-y-1/2',
						isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2',
						status ? statusColorClass : 'bg-destructive',
					)}
					style={`${offsetStyle}${color ? ` background-color: ${color};` : ''}`}
				></span>
			{:else if displayCount !== null}
				<span
					data-slot="badge-count"
					class={cn(
						'absolute top-0 right-0 z-10 flex items-center justify-center rounded-full leading-none shadow-xs ring-2 ring-background transform translate-x-1/2 -translate-y-1/2 whitespace-nowrap',
						isSmall ? 'min-w-3.5 h-3.5 px-1 text-[9px] font-medium' : 'min-w-4.5 h-4.5 px-1.5 text-[11px] font-semibold',
						status ? cn(statusColorClass, 'text-primary-foreground') : 'bg-destructive text-destructive-foreground',
					)}
					style={`${offsetStyle}${color ? ` background-color: ${color};` : ''}`}
				>
					{displayCount}
				</span>
			{/if}
		{/if}
	</svelte:element>
{:else if isStatusMode && !children && hasBadge}
	<!-- 独立数字角标或小红点 (Standalone Badge) -->
	<svelte:element
		this={href ? "a" : "span"}
		bind:this={ref}
		data-svadmin-component="badge"
		data-slot="badge-standalone"
		data-size={size}
		{href}
		class={cn('inline-flex items-center align-middle', className)}
		{...restProps}
	>
		{#if dot}
			<span
				class={cn('rounded-full', isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2', status ? statusColorClass : 'bg-destructive')}
				style={color ? `background-color: ${color}` : undefined}
			></span>
		{:else if displayCount !== null}
			<span
				class={cn(
					'flex items-center justify-center rounded-full leading-none shadow-xs whitespace-nowrap',
					isSmall ? 'min-w-3.5 h-3.5 px-1 text-[9px] font-medium' : 'min-w-4.5 h-4.5 px-1.5 text-[11px] font-semibold',
					status ? cn(statusColorClass, 'text-primary-foreground') : 'bg-destructive text-destructive-foreground',
				)}
				style={color ? `background-color: ${color}` : undefined}
			>
				{displayCount}
			</span>
		{/if}
	</svelte:element>
{:else}
	<!-- 原始基础标签 (Pill Variant Badge) -->
	<svelte:element
		this={href ? "a" : "span"}
		bind:this={ref}
		data-svadmin-component="badge"
		data-slot="badge"
		data-variant={variant}
		data-size={size}
		{href}
		class={cn(resolveBadgeVariants({ variant }), className)}
		{...restProps}
	>
		{@render children?.()}
	</svelte:element>
{/if}
