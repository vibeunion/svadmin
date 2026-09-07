<script lang="ts">
	import { cn } from "../../../utils.js";

	let { class: className }: { class?: string } = $props();
</script>

<div
	data-slot="dropdown-menu-separator"
	class={cn("svadmin-dropdown-separator", className)}
></div>
