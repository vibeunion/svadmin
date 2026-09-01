<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { provideCodeBlockLanguageSelectorContext } from './context.svelte.js';
  let { defaultValue = '', value = $bindable(defaultValue), open = $bindable(false), class: className = '', children, onvaluechange, onopenchange, ...rest }: { value?: string; defaultValue?: string; open?: boolean; class?: string; children?: Snippet; onvaluechange?: (value: string) => void; onopenchange?: (open: boolean) => void; [key: string]: unknown } = $props();
  function setValue(next: string): void { value = next; onvaluechange?.(next); open = false; onopenchange?.(false); }
  function setOpen(next: boolean): void { open = next; onopenchange?.(next); }
  provideCodeBlockLanguageSelectorContext({ get value() { return value; }, get open() { return open; }, setValue, setOpen });
</script>
<div class={cn('relative', className)} data-state={open ? 'open' : 'closed'} {...rest}>{@render children?.()}</div>
