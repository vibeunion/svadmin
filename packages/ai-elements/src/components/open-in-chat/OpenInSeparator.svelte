<script lang="ts">import { cn } from '../../utils.js'; let { class: className = '', ...rest }: { class?: string; [key: string]: unknown } = $props();</script>
<div class={cn('-mx-1 my-1 h-px bg-border', className)} role="separator" {...rest}></div>
