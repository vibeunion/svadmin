<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		onOpenChange,
		class: className,
		children,
		...restProps
	}: Props = $props();

	import { setContext } from "svelte";

	// 溢出菜单可以挂到 body。点击判断必须把这块节点算进去，否则捕获阶段会先把菜单卸掉。
	const contentBridge: { node: HTMLElement | null } = { node: null };

	function handleClickOutside(e: MouseEvent) {
		const target = e.target;
		if (!(target instanceof Node)) return;
		if (ref?.contains(target) || contentBridge.node?.contains(target)) return;
		open = false;
		onOpenChange?.(false);
	}

	setContext("svadmin-dropdown-open", () => open);
	setContext("svadmin-dropdown-content", contentBridge);
	setContext("svadmin-dropdown-root", () => ref);
	setContext("svadmin-dropdown-toggle", () => {
		open = !open;
		onOpenChange?.(open);
	});

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu"
	class={cn("svadmin-dropdown-menu", className)}
	{...restProps}
>
	{@render children?.()}
</div>
