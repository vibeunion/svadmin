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

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-3', className)}>
  <div class="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground">
      Electronic Signature <span class="text-muted-foreground font-normal">(Sign inside the box)</span>
    </div>

    <div class="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        disabled={history.length === 0 || disabled}
        onclick={undo}
      >
        <RotateCcw class="h-3 w-3" />
        Undo
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        disabled={isEmpty || disabled}
        onclick={clear}
      >
        <Trash2 class="h-3 w-3" />
        Clear
      </Button>

      {#if onsave}
        <Button
          size="sm"
          class="h-7 text-xs gap-1"
          disabled={isEmpty || disabled}
          onclick={handleSave}
        >
          <Check class="h-3 w-3" />
          Confirm
        </Button>
      {:else}
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs gap-1"
          disabled={isEmpty || disabled}
          onclick={handleDownload}
        >
          <Download class="h-3 w-3" />
          Download
        </Button>
      {/if}
    </div>
  </div>

  <!-- Canvas Drawing Board -->
  <div class="relative w-full rounded-lg border-2 border-dashed border-border/80 bg-background overflow-hidden flex items-center justify-center">
    <canvas
      bind:this={canvasEl}
      {width}
      {height}
      class="touch-none cursor-crosshair max-w-full h-auto block"
      onmousedown={startDrawing}
      onmousemove={draw}
      onmouseup={stopDrawing}
      onmouseleave={stopDrawing}
      ontouchstart={(e) => { e.preventDefault(); startDrawing(e); }}
      ontouchmove={(e) => { e.preventDefault(); draw(e); }}
      ontouchend={(e) => { e.preventDefault(); stopDrawing(); }}
    ></canvas>

    {#if isEmpty}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/40 font-mono text-xs select-none">
        Sign here with mouse or touch
      </div>
    {/if}
  </div>
</div>
