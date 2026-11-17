<script lang="ts">
  import QRCodeLib from 'qrcode';
  import { Loader2, RefreshCw, CheckCircle2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { hasComponentConfig, useComponentConfig } from './ConfigProvider.svelte';
  import { componentText, resolveComponentLocale } from './component-messages.js';

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
    /** Whether to show border and background. */
    bordered?: boolean;
    /** Center icon/logo image URL. */
    icon?: string;
    /** Center icon/logo image URL alias. */
    image?: string;
    /** Center icon size in pixels. */
    iconSize?: number;
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
    /** Overrides ConfigProvider and i18n for the status copy. */
    locale?: string;
    ariaLabel?: string;
    class?: string;
  }

  let {
    value,
    size = 160,
    bordered = true,
    icon,
    image,
    iconSize,
    margin = 4,
    errorCorrectionLevel = 'M',
    color = 'var(--foreground, black)',
    background = 'var(--background, white)',
    status = 'normal',
    statusText,
    onrefresh,
    locale,
    ariaLabel = 'QR code',
    class: className = '',
  }: Props = $props();

  const config = useComponentConfig();
  const i18n = useTranslation();
  const provided = hasComponentConfig();
  const activeLocale = $derived(resolveComponentLocale({
    explicit: locale,
    configLocale: provided ? config.locale : undefined,
    i18nLocale: i18n.locale,
  }));
  const copy = $derived({
    expired: componentText(i18n, activeLocale, 'qrCode.expired'),
    refresh: componentText(i18n, activeLocale, 'qrCode.refresh'),
    refreshLabel: componentText(i18n, activeLocale, 'qrCode.refreshLabel'),
    scanned: componentText(i18n, activeLocale, 'qrCode.scanned'),
    empty: componentText(i18n, activeLocale, 'qrCode.empty'),
  });

  const centerIcon = $derived(image ?? icon);
  const effectiveIconSize = $derived(iconSize ?? Math.round(size / 4.5));

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

<figure
  class={cn('svadmin-qr-code relative', !bordered && 'border-0 p-0 bg-transparent', className)}
  data-slot="qr-code"
  data-status={status}
  data-bordered={bordered}
>
  {#if matrix}
    <div class="relative inline-flex items-center justify-center">
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
      {#if centerIcon && status === 'normal'}
        <img
          src={centerIcon}
          alt=""
          class="absolute rounded-xs bg-background p-0.5 shadow-xs object-contain pointer-events-none"
          style={`width: ${effectiveIconSize}px; height: ${effectiveIconSize}px;`}
        />
      {/if}
    </div>
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
          <p class="svadmin-qr-code__status-text">{statusText ?? copy.expired}</p>
          <button
            type="button"
            class="svadmin-qr-code__refresh-btn"
            onclick={onrefresh}
            aria-label={copy.refreshLabel}
          >
            <RefreshCw size={12} />
            <span>{copy.refresh}</span>
          </button>
        {:else if status === 'scanned'}
          <CheckCircle2 class="text-success size-7" />
          <p class="svadmin-qr-code__status-text">{statusText ?? copy.scanned}</p>
        {/if}
      </div>
    {/if}
  {:else}
    <p class="svadmin-qr-code__empty" role="status">{copy.empty}</p>
  {/if}
</figure>

<style>
  .svadmin-qr-code {
    position: relative;
    display: inline-flex;
    margin: 0;
    border: 1px solid var(--border, currentColor);
    border-radius: var(--radius);
    padding: var(--svadmin-space-2);
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
  }

  .svadmin-qr-code__svg { display: block; border-radius: var(--border-radius-small, 2px); }
  .svadmin-qr-code__empty {
    margin: 0;
    padding: var(--svadmin-space-4);
    color: var(--muted-foreground, currentColor);
    font-size: var(--svadmin-text-body);
    line-height: 1.5715;
  }

  .svadmin-qr-code__mask {
    position: absolute;
    inset: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: color-mix(in srgb, var(--card, white) 92%, transparent);
    border-radius: var(--border-radius-small, 2px);
    text-align: center;
    padding: var(--svadmin-space-2);
  }
  .svadmin-qr-code__status-text {
    margin: 0;
    color: var(--foreground);
    font-size: var(--svadmin-text-caption);
    line-height: 1.6667;
  }
  .svadmin-qr-code__refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--svadmin-space-1);
    padding: 1px 4px;
    border: 0;
    border-radius: var(--border-radius-small, 2px);
    background: transparent;
    color: var(--primary);
    font-size: var(--svadmin-text-caption);
    line-height: 1.6667;
    cursor: pointer;
  }
  .svadmin-qr-code__refresh-btn:hover { background: var(--svadmin-fill-2, var(--muted)); }
  .svadmin-qr-code__refresh-btn:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }
</style>
