<script lang="ts">import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; let { class: className = '', ...rest }: Omit<HTMLAttributes<HTMLDivElement>, 'class'> & { class?: string } = $props();</script>
<div {...rest} class={cn('my-1 h-px bg-border', className)} role="separator" data-slot="voice-selector-separator"></div>
