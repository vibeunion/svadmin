<script lang="ts" module>
	import { badgeVariants as resolveBadgeVariants, type BadgeVariant as BadgeVariantValue } from "./badge-variants.js";

	export { badgeVariants, type BadgeVariant } from "./badge-variants.js";
	export type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning';
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
		size?: "default" | "compact";
		count?: number | string | undefined;
		overflowCount?: number | undefined;
		dot?: boolean | undefined;
		status?: BadgeStatus | undefined;
		text?: string | undefined;
		offset?: [number, number] | undefined;
		showZero?: boolean | undefined;
		color?: string | undefined;
	} = $props();

	const config = useComponentConfig();
	const size = $derived(sizeProp ?? (config.density === "compact" || config.componentSize === "sm" ? "compact" : "default"));

	const isArcoMode = $derived(count !== undefined || dot || status !== undefined);

	const displayCount = $derived.by(() => {
		if (count === undefined) return null;
		if (typeof count === 'number') {
			if (count === 0 && !showZero) return null;
			if (count > overflowCount) return `${overflowCount}+`;
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
				return 'bg-primary';
			case 'warning':
				return 'bg-warning';
			case 'error':
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
		{href}
		class={cn('inline-flex items-center gap-2 text-sm text-foreground', className)}
		{...restProps}
	>
		<span class="relative flex h-2 w-2">
			{#if status === 'processing'}
				<span class={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', statusColorClass)} style={color ? `background-color: ${color}` : undefined}></span>
			{/if}
			<span class={cn('relative inline-flex h-2 w-2 rounded-full', statusColorClass)} style={color ? `background-color: ${color}` : undefined}></span>
		</span>
		{#if text}
			<span class="svadmin-badge-status-text select-none text-xs">{text}</span>
		{/if}
	</svelte:element>
{:else if isArcoMode && children}
	<!-- 包裹宿主元素右上角角标 (Wrapped Badge) -->
	<svelte:element
		this={href ? "a" : "span"}
		bind:this={ref}
		data-svadmin-component="badge"
		data-slot="badge-wrapper"
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
						'absolute top-0 right-0 z-10 h-2 w-2 rounded-full ring-2 ring-background transform translate-x-1/2 -translate-y-1/2',
						status ? statusColorClass : 'bg-destructive',
					)}
					style={`${offsetStyle}${color ? ` background-color: ${color};` : ''}`}
				></span>
			{:else if displayCount !== null}
				<span
					data-slot="badge-count"
					class={cn(
						'absolute top-0 right-0 z-10 flex min-w-4.5 h-4.5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none shadow-xs ring-2 ring-background transform translate-x-1/2 -translate-y-1/2 whitespace-nowrap',
						status ? cn(statusColorClass, 'text-primary-foreground') : 'bg-destructive text-destructive-foreground',
					)}
					style={`${offsetStyle}${color ? ` background-color: ${color};` : ''}`}
				>
					{displayCount}
				</span>
			{/if}
		{/if}
	</svelte:element>
{:else if isArcoMode && !children && hasBadge}
	<!-- 独立数字角标或小红点 (Standalone Badge) -->
	<svelte:element
		this={href ? "a" : "span"}
		bind:this={ref}
		data-svadmin-component="badge"
		data-slot="badge-standalone"
		{href}
		class={cn('inline-flex items-center align-middle', className)}
		{...restProps}
	>
		{#if dot}
			<span
				class={cn('h-2 w-2 rounded-full', status ? statusColorClass : 'bg-destructive')}
				style={color ? `background-color: ${color}` : undefined}
			></span>
		{:else if displayCount !== null}
			<span
				class={cn(
					'flex min-w-4.5 h-4.5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none shadow-xs whitespace-nowrap',
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
