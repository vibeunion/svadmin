<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet; value?: string; }
  let { class: className = '', children, value, ...rest }: Props = $props();
  const labels: Record<string, string> = { american: 'US', british: 'UK', australian: 'AU', canadian: 'CA', irish: 'IE', scottish: 'SC', indian: 'IN', 'south-african': 'ZA', 'new-zealand': 'NZ', spanish: 'ES', french: 'FR', german: 'DE', italian: 'IT', portuguese: 'PT', brazilian: 'BR', mexican: 'MX', argentinian: 'AR', japanese: 'JP', chinese: 'CN', korean: 'KR', russian: 'RU', arabic: 'AR', dutch: 'NL', swedish: 'SE', norwegian: 'NO', danish: 'DK', finnish: 'FI', polish: 'PL', turkish: 'TR', greek: 'GR' };
</script>
<span {...rest} class={cn('inline-flex items-center text-xs text-muted-foreground', className)} data-slot="voice-selector-accent" aria-label={value ? `Accent: ${value}` : 'Accent'}>{#if children}{@render children()}{:else}{labels[value ?? ''] ?? value ?? ''}{/if}</span>
