<script lang="ts">
  import QRCodeLib from 'qrcode';

  interface Props {
    value: string;
    size?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: string;
    background?: string;
    ariaLabel?: string;
  }

  let {
    value,
    size = 160,
    margin = 4,
    errorCorrectionLevel = 'M',
    color = '#1D2129',
    background = '#FFFFFF',
    ariaLabel = 'QR code',
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

<figure class="lite-qr-code">
  {#if matrix}
    <svg width={size} height={size} viewBox={`0 0 ${matrix.total} ${matrix.total}`} role="img" aria-label={ariaLabel} shape-rendering="crispEdges">
      <rect width={matrix.total} height={matrix.total} fill={background} />
      <path d={matrix.path} fill={color} />
    </svg>
  {:else}
    <p class="lite-muted" role="status">No QR content.</p>
  {/if}
</figure>

<style>
  .lite-qr-code { display: inline-flex; margin: 0; padding: 8px; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; }
  .lite-qr-code svg { display: block; max-width: 100%; height: auto; }
  .lite-qr-code p { margin: 0; padding: 16px; color: #86909C; font-size: 13px; }
</style>
