<script lang="ts">
  import QRCodeLib from 'qrcode';
  import { cn } from '../utils.js';

  /**
   * Renders a QR code from the Svelte ecosystem `qrcode` package as a crisp
   * SVG. No canvas is required, so it is safe under SSR and test DOMs.
   */
  interface Props {
    /** Content to encode. Empty content renders a neutral placeholder. */
    value: string;
    /** Rendered size in pixels. */
    size?: number;
    /** Quiet-zone width in modules. Keep at least 4 for reliable scanning. */
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    /** Module color; defaults to the semantic foreground token. */
    color?: string;
    /** Background color; defaults to the semantic background token. */
    background?: string;
    ariaLabel?: string;
    class?: string;
  }

  let {
    value,
    size = 160,
    margin = 4,
    errorCorrectionLevel = 'M',
    color = 'var(--foreground, black)',
    background = 'var(--background, white)',
    ariaLabel = 'QR code',
    class: className = '',
  }: Props = $props();

  const matrix = $derived.by(() => {
    if (!value) return null;
    try {
      const qr = QRCodeLib.create(value, { errorCorrectionLevel });
      const moduleCount = qr.modules.size;
      const data = qr.modules.data;
      const total = moduleCount + margin * 2;
      let path = '';
      for (let y = 0; y < moduleCount; y += 1) {
        for (let x = 0; x < moduleCount; x += 1) {
          if (data[y * moduleCount + x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
        }
      }
      return { total, path };
    } catch {
      return null;
    }
  });
</script>

<figure class={cn('svadmin-qr-code', className)} data-slot="qr-code">
  {#if matrix}
    <svg
      class="svadmin-qr-code__svg"
      width={size}
      height={size}
      viewBox={`0 0 ${matrix.total} ${matrix.total}`}
      role="img"
      aria-label={ariaLabel}
      shape-rendering="crispEdges"
    >
      <rect width={matrix.total} height={matrix.total} fill={background} />
      <path d={matrix.path} fill={color} />
    </svg>
  {:else}
    <p class="svadmin-qr-code__empty" role="status">No QR content.</p>
  {/if}
</figure>

<style>
  .svadmin-qr-code {
    display: inline-flex;
    margin: 0;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.75rem);
    padding: 0.5rem;
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
  }

  .svadmin-qr-code__svg { display: block; border-radius: calc(min(var(--radius, 0.5rem), 0.75rem) - 0.25rem); }
  .svadmin-qr-code__empty { margin: 0; padding: 1rem; color: var(--muted-foreground, currentColor); font-size: 0.8125rem; }
</style>