<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		children,
		"aria-label": ariaLabel = "Loading…",
		...restProps
	}: CommandPrimitive.LoadingProps = $props();
</script>

<CommandPrimitive.Loading bind:ref {...restProps}>
	{#snippet child({ props })}
		<div {...props} data-slot="command-loading" data-cmdk-loading="" aria-label={ariaLabel}>
			{@render children?.()}
		</div>
	{/snippet}
</CommandPrimitive.Loading>
