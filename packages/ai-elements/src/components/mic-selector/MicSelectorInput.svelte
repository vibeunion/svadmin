<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  type Props = { value?: string; class?: string; placeholder?: string };
  let { value = $bindable(''), class: className = '', placeholder = 'Search microphones...' }: Props = $props();
</script>

<label class={cn('flex items-center gap-2', className)}><Search size={14} aria-hidden="true" /><span class="svadmin-ai__sr-only">Search microphones</span><input class="svadmin-ai__input" type="search" bind:value {placeholder} /></label>
