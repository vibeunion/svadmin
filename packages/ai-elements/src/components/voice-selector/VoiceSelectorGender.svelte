<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { CircleSmall, Mars, MarsStroke, NonBinary, Transgender, Venus, VenusAndMars } from '@lucide/svelte'; import { cn } from '../../utils.js';
  export type VoiceGender = 'male' | 'female' | 'transgender' | 'androgyne' | 'non-binary' | 'intersex';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet; value?: VoiceGender; }
  let { class: className = '', children, value, ...rest }: Props = $props();
</script>
<span {...rest} class={cn('inline-flex items-center text-xs text-muted-foreground', className)} data-slot="voice-selector-gender" aria-label={value ? `Gender: ${value}` : 'Gender'}>{#if children}{@render children()}{:else if value === 'male'}<Mars size={14} aria-hidden="true" />{:else if value === 'female'}<Venus size={14} aria-hidden="true" />{:else if value === 'transgender'}<Transgender size={14} aria-hidden="true" />{:else if value === 'androgyne'}<MarsStroke size={14} aria-hidden="true" />{:else if value === 'non-binary'}<NonBinary size={14} aria-hidden="true" />{:else if value === 'intersex'}<VenusAndMars size={14} aria-hidden="true" />{:else}<CircleSmall size={14} aria-hidden="true" />{/if}</span>
