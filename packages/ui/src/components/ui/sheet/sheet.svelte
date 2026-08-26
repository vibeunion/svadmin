<script lang="ts" module>
	let bodyScrollLockDepth = 0;
	let bodyOverflowBeforeLock = "";
	const openSheets: HTMLElement[] = [];

	function lockBodyScroll() {
		if (bodyScrollLockDepth === 0) bodyOverflowBeforeLock = document.body.style.overflow;
		bodyScrollLockDepth += 1;
		document.body.style.overflow = "hidden";
	}

	function unlockBodyScroll() {
		bodyScrollLockDepth = Math.max(0, bodyScrollLockDepth - 1);
		if (bodyScrollLockDepth > 0) return;
		document.body.style.overflow = bodyOverflowBeforeLock;
		bodyOverflowBeforeLock = "";
	}

	function registerSheet(panel: HTMLElement) {
		openSheets.push(panel);
	}

	function unregisterSheet(panel: HTMLElement) {
		const index = openSheets.lastIndexOf(panel);
		if (index >= 0) openSheets.splice(index, 1);
	}

	function isTopmostSheet(panel: HTMLElement) {
		return openSheets.at(-1) === panel;
	}
</script>

<script lang="ts">
/* eslint-disable svelte/no-unused-svelte-ignore */
	import { tick } from "svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	const focusableSelector = [
		'a[href]',
		'button',
		'input',
		'select',
		'textarea',
		'[tabindex]:not([tabindex="-1"])',
		'[contenteditable]:not([contenteditable="false"])',
	].join(",");

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		side?: "left" | "right";
		onClose?: () => void;
		closeLabel?: string;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		side = "right",
		onClose,
		closeLabel = "Close",
		class: className,
		tabindex = -1,
		children,
		...restProps
	}: Props = $props();

	function close() {
		open = false;
		onClose?.();
	}

	function isContentEditableHost(element: HTMLElement) {
		const contentEditable = element.getAttribute("contenteditable");
		const isEditable = element.isContentEditable || (contentEditable !== null && contentEditable.toLowerCase() !== "false");
		return isEditable && !element.parentElement?.isContentEditable;
	}

	function isVisible(element: HTMLElement) {
		for (let current: HTMLElement | null = element; current; current = current.parentElement) {
			const style = getComputedStyle(current);
			if (style.display === "none" || style.visibility === "hidden") return false;
			if (current === ref) break;
		}
		return true;
	}

	function isTabbable(element: HTMLElement) {
		if (element.matches(":disabled, [aria-disabled='true']")) return false;
		if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
		if (element.hasAttribute("tabindex") && element.tabIndex < 0) return false;
		if (!element.hasAttribute("tabindex") && !isContentEditableHost(element) && element.tabIndex < 0) return false;
		return isVisible(element);
	}

	function tabbableElements() {
		return ref ? [...ref.querySelectorAll<HTMLElement>(focusableSelector)].filter(isTabbable) : [];
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented || !open || !ref || !isTopmostSheet(ref)) return;
		if (event.key === "Escape") {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== "Tab") return;

		const tabbable = tabbableElements();
		if (tabbable.length === 0) {
			event.preventDefault();
			ref.focus();
			return;
		}

		const first = tabbable[0];
		const last = tabbable.at(-1);
		const activeIndex = tabbable.indexOf(document.activeElement as HTMLElement);
		if (!ref.contains(document.activeElement) || activeIndex === -1) {
			event.preventDefault();
			(event.shiftKey ? last : first)?.focus();
		} else if (event.shiftKey && activeIndex === 0) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && activeIndex === tabbable.length - 1) {
			event.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		if (!open || !ref) return;
		const panel = ref;
		const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		registerSheet(panel);
		lockBodyScroll();
		void tick().then(() => {
			if (open && ref === panel && isTopmostSheet(panel)) {
				(tabbableElements()[0] ?? panel).focus();
			}
		});
		return () => {
			unregisterSheet(panel);
			unlockBodyScroll();
			const remainingSheet = openSheets.at(-1);
			if (!remainingSheet || (previousFocus && remainingSheet.contains(previousFocus))) {
				previousFocus?.focus();
			}
		};
	});
</script>

<svelte:document onkeydown={handleKeydown} />

{#if open}
	<!-- Overlay -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		role="presentation"
		class="fixed inset-0 z-50 bg-black/80 animate-in fade-in-0"
		onclick={close}
	></div>

	<!-- Sheet panel -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={ref}
		data-slot="sheet"
		{tabindex}
		class={cn(
			"fixed z-50 flex translate-x-0 flex-col gap-4 bg-background p-6 shadow-lg",
			side === "right"
				? "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l"
				: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r",
			className
		)}
		{...restProps}
	>
		{@render children?.()}

		<!-- Close button -->
		<button
			type="button"
			class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			onclick={close}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 6 6 18"/><path d="m6 6 12 12"/>
			</svg>
			<span class="sr-only">{closeLabel}</span>
		</button>
	</div>
{/if}
