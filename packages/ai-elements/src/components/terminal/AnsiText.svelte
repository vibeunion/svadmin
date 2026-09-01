<script lang="ts">
  import { parseAnsi } from './ansi.js';

  let { text }: { text: string } = $props();
  const segments = $derived(parseAnsi(text));
</script>

{#each segments as segment, index (`${index}-${segment.text}`)}
  <span
    data-ansi-foreground={segment.foreground}
    data-ansi-background={segment.background}
    data-ansi-bold={segment.bold || undefined}
    data-ansi-dim={segment.dim || undefined}
    data-ansi-italic={segment.italic || undefined}
    data-ansi-underline={segment.underline || undefined}
    data-ansi-strikethrough={segment.strikethrough || undefined}
  >{segment.text}</span>
{/each}

<style>
  [data-ansi-bold='true'] { font-weight: 700; }
  [data-ansi-dim='true'] { opacity: .65; }
  [data-ansi-italic='true'] { font-style: italic; }
  [data-ansi-underline='true'] { text-decoration: underline; }
  [data-ansi-strikethrough='true'] { text-decoration: line-through; }
  [data-ansi-foreground='black'] { color: var(--muted-foreground, currentColor); }
  [data-ansi-foreground='red'] { color: var(--destructive, currentColor); }
  [data-ansi-foreground='green'] { color: var(--success, currentColor); }
  [data-ansi-foreground='yellow'] { color: var(--warning, currentColor); }
  [data-ansi-foreground='blue'] { color: var(--info, var(--primary, currentColor)); }
  [data-ansi-foreground='magenta'] { color: var(--chart-4, var(--primary, currentColor)); }
  [data-ansi-foreground='cyan'] { color: var(--chart-5, var(--info, currentColor)); }
  [data-ansi-foreground='white'] { color: var(--foreground, currentColor); }
  [data-ansi-background='black'] { background: var(--muted, transparent); }
  [data-ansi-background='red'] { background: color-mix(in srgb, var(--destructive, currentColor) 22%, transparent); }
  [data-ansi-background='green'] { background: color-mix(in srgb, var(--success, currentColor) 22%, transparent); }
  [data-ansi-background='yellow'] { background: color-mix(in srgb, var(--warning, currentColor) 22%, transparent); }
  [data-ansi-background='blue'] { background: color-mix(in srgb, var(--info, var(--primary, currentColor)) 22%, transparent); }
  [data-ansi-background='magenta'] { background: color-mix(in srgb, var(--chart-4, var(--primary, currentColor)) 22%, transparent); }
  [data-ansi-background='cyan'] { background: color-mix(in srgb, var(--chart-5, var(--info, currentColor)) 22%, transparent); }
  [data-ansi-background='white'] { background: color-mix(in srgb, var(--foreground, currentColor) 18%, transparent); }
</style>
