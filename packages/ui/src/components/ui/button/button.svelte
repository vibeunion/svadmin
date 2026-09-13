<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import {
		buttonVariants as variants,
		type ButtonSize as Size,
		type ButtonVariant as Variant,
	} from "./button-variants.js";

	export const buttonVariants = variants;
	export type ButtonSize = Size;
	export type ButtonVariant = Variant;

	type ButtonStyleProps = {
		variant?: ButtonVariant | undefined;
		size?: ButtonSize | undefined;
		disabled?: boolean | null | undefined;
		type?: HTMLButtonAttributes['type'] | undefined;
	};

	export type ButtonProps = Omit<WithElementRef<HTMLButtonAttributes, HTMLButtonElement>, 'href' | 'type' | 'disabled'> & ButtonStyleProps & {
		href?: string;
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
	};
</script>

<script lang="ts">
/* eslint-disable no-useless-assignment, @typescript-eslint/no-explicit-any */
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();

	let anchorRef: HTMLAnchorElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);

	$effect(() => {
		if (href && anchorRef) ref = anchorRef as any;
		else if (!href && buttonRef) ref = buttonRef as any;
	});
</script>

{#if href}
	<a
		bind:this={anchorRef}
		data-slot="button"
		data-variant={variant}
		data-size={size}
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...(restProps as Omit<HTMLAnchorAttributes, 'children' | 'class' | 'href' | 'disabled'>)}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={buttonRef}
		data-slot="button"
		data-variant={variant}
		data-size={size}
		class={cn(buttonVariants({ variant, size }), className)}
		type={type as HTMLButtonAttributes['type']}
		{disabled}
		{...(restProps as Omit<HTMLButtonAttributes, 'children' | 'class' | 'type' | 'disabled'>)}
	>
		{@render children?.()}
	</button>
{/if}
