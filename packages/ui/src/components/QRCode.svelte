<script lang="ts">
  import QRCodeLib from 'qrcode';
  import { Loader2, RefreshCw, CheckCircle2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type QRCodeStatus = 'normal' | 'loading' | 'expired' | 'scanned';

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
    /** Current status of the QR code */
    status?: QRCodeStatus;
    /** Custom status text displayed on overlay */
    statusText?: string;
    /** Callback when user clicks the refresh button in expired status */
    onrefresh?: () => void;
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
    status = 'normal',
    statusText,
    onrefresh,
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

<figure class={cn('svadmin-qr-code relative', className)} data-slot="qr-code" data-status={status}>
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
    {#if status !== 'normal'}
      <div
        class="svadmin-qr-code__mask"
        data-slot="qr-code-mask"
        data-status={status}
      >
        {#if status === 'loading'}
          <Loader2 class="animate-spin text-primary size-7" />
          {#if statusText}<span class="svadmin-qr-code__status-text">{statusText}</span>{/if}
        {:else if status === 'expired'}
          <p class="svadmin-qr-code__status-text">{statusText ?? '二维码已失效'}</p>
          <button
            type="button"
            class="svadmin-qr-code__refresh-btn"
            onclick={onrefresh}
            aria-label="Refresh QR code"
          >
            <RefreshCw size={14} />
            <span>点击刷新</span>
          </button>
        {:else if status === 'scanned'}
          <CheckCircle2 class="text-success size-7" />
          <p class="svadmin-qr-code__status-text">{statusText ?? '已扫描'}</p>
        {/if}
      </div>
    {/if}
  {:else}
    <p class="svadmin-qr-code__empty" role="status">No QR content.</p>
  {/if}
</figure>

<style>
  .svadmin-qr-code {
    position: relative;
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

  .svadmin-qr-code__mask {
    position: absolute;
    inset: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: color-mix(in srgb, var(--card, white) 90%, transparent);
    backdrop-filter: blur(2px);
    border-radius: calc(min(var(--radius, 0.5rem), 0.75rem) - 0.25rem);
    text-align: center;
    padding: 0.5rem;
  }
  .svadmin-qr-code__status-text {
    font-size: var(--svadmin-text-caption, 0.75rem);
    color: var(--foreground);
    margin: 0;
  }
  .svadmin-qr-code__refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: var(--svadmin-text-caption, 0.75rem);
    color: var(--primary);
    background: var(--accent, var(--muted));
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    transition: background 150ms ease;
  }
  .svadmin-qr-code__refresh-btn:hover {
    background: var(--accent);
    color: var(--primary);
  }
</style>
