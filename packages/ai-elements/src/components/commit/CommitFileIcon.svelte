<script lang="ts">import { File } from '@lucide/svelte'; import { cn } from '../../utils.js'; let { class: className = '', ...rest }: { class?: string; [key: string]: unknown } = $props();</script>
<File class={cn('size-3.5 shrink-0 text-muted-foreground', className)} aria-hidden="true" {...rest} />
