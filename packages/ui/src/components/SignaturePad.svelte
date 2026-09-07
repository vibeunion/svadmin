<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from './ui/button/index.js';
  import { RotateCcw, Trash2, Check, Download } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: string;
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
    disabled?: boolean;
    onchange?: (dataUrl: string) => void;
    onsave?: (dataUrl: string) => void;
    class?: string;
  }

  let {
    value = $bindable(''),
    width = 500,
    height = 200,
    strokeColor = 'currentColor',
    strokeWidth = 2.5,
    disabled = false,
    onchange,
    onsave,
    class: className = '',
  }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let isDrawing = $state(false);
  let isEmpty = $state(true);
  let history = $state<ImageData[]>([]);

  interface Point {
    x: number;
    y: number;
  }

  let points: Point[] = [];

  function getCanvasPos(e: MouseEvent | TouchEvent): Point | null {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }

  function startDrawing(e: MouseEvent | TouchEvent) {
    if (disabled || !canvasEl) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      history = [...history, ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)];
    }

    isDrawing = true;
    points = [pos];
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing || disabled || !canvasEl) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    points.push(pos);
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = strokeColor === 'currentColor' ? (canvasEl ? getComputedStyle(canvasEl).color : 'rgb(0,0,0)') : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length < 3) {
      const b = points[0];
      if (b) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.closePath();
      }
      return;
    }

    ctx.beginPath();
    const p0 = points[0];
    if (p0) {
      ctx.moveTo(p0.x, p0.y);
    }
    for (let i = 1; i < points.length - 1; i++) {
      const pi = points[i];
      const pi1 = points[i + 1];
      if (pi && pi1) {
        const xc = (pi.x + pi1.x) / 2;
        const yc = (pi.y + pi1.y) / 2;
        ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
      }
    }
    ctx.stroke();
    isEmpty = false;
  }

  function stopDrawing() {
    if (!isDrawing || !canvasEl) return;
    isDrawing = false;
    points = [];

    const dataUrl = canvasEl.toDataURL('image/png');
    value = dataUrl;
    onchange?.(dataUrl);
  }

  export function clear() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    history = [];
    isEmpty = true;
    value = '';
    onchange?.('');
  }

  export function undo() {
    if (!canvasEl || history.length === 0) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const previous = history[history.length - 1];
    history = history.slice(0, -1);
    if (previous) {
      ctx.putImageData(previous, 0, 0);
    }
    isEmpty = history.length === 0;
    const dataUrl = isEmpty ? '' : canvasEl.toDataURL('image/png');
    value = dataUrl;
    onchange?.(dataUrl);
  }

  function handleSave() {
    if (isEmpty || !canvasEl) return;
    const dataUrl = canvasEl.toDataURL('image/png');
    onsave?.(dataUrl);
  }

  function handleDownload() {
    if (isEmpty || !canvasEl) return;
    const a = document.createElement('a');
    a.href = canvasEl.toDataURL('image/png');
    a.download = `signature_${Date.now()}.png`;
    a.click();
  }

  onMount(() => {
    if (canvasEl && value) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasEl?.getContext('2d');
        if (ctx && canvasEl) {
          ctx.drawImage(img, 0, 0);
          isEmpty = false;
        }
      };
      img.src = value;
    }
  });
</script>

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6ed543e2fbbb', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
      Electronic Signature <span class="svadmin-u-bfa603190748 svadmin-u-8ecebc9f80e6">(Sign inside the box)</span>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
        disabled={history.length === 0 || disabled}
        onclick={undo}
      >
        <RotateCcw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Undo
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2 svadmin-u-8db899b4e072"
        disabled={isEmpty || disabled}
        onclick={clear}
      >
        <Trash2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Clear
      </Button>

      {#if onsave}
        <Button
          size="sm"
          class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421"
          disabled={isEmpty || disabled}
          onclick={handleSave}
        >
          <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          Confirm
        </Button>
      {:else}
        <Button
          variant="outline"
          size="sm"
          class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421"
          disabled={isEmpty || disabled}
          onclick={handleDownload}
        >
          <Download class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          Download
        </Button>
      {/if}
    </div>
  </div>

  <!-- Canvas Drawing Board -->
  <div class="svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-65935df577ba svadmin-u-a29b7a649c77 svadmin-u-c9ed8c5f79ae svadmin-u-e6f9e383a762 svadmin-u-2cd02d11d1af svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227">
    <canvas
      bind:this={canvasEl}
      {width}
      {height}
      class="touch-none svadmin-u-92b7f35f04c0 svadmin-u-c0980a65a70d svadmin-u-b8f0a08ece1e svadmin-u-0214b4b355d1"
      onmousedown={startDrawing}
      onmousemove={draw}
      onmouseup={stopDrawing}
      onmouseleave={stopDrawing}
      ontouchstart={(e) => { e.preventDefault(); startDrawing(e); }}
      ontouchmove={(e) => { e.preventDefault(); draw(e); }}
      ontouchend={(e) => { e.preventDefault(); stopDrawing(); }}
    ></canvas>

    {#if isEmpty}
      <div class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-a4326536b8f5 svadmin-u-52183a1cca53 svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-7f6912283f11">
        Sign here with mouse or touch
      </div>
    {/if}
  </div>
</div>
