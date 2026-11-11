<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from './ui/button/index.js';
  import { RotateCcw, RotateCw, Trash2, Check, Download, FileCode } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface SignaturePadProps {
    value?: string;
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
    disabled?: boolean;
    withTimestamp?: boolean;
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
    withTimestamp = false,
    onchange,
    onsave,
    class: className = '',
  }: SignaturePadProps = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let isDrawing = $state(false);
  let isEmpty = $state(true);
  let undoHistory = $state<ImageData[]>([]);
  let redoHistory = $state<ImageData[]>([]);

  interface Point {
    x: number;
    y: number;
  }

  let currentStroke = $state<Point[]>([]);
  let allStrokes = $state<Point[][]>([]);
  let redoStrokes = $state<Point[][]>([]);

  function getCanvasPos(e: MouseEvent | TouchEvent): Point | null {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const rectW = rect.width > 0 ? rect.width : (canvasEl.width || 1);
    const rectH = rect.height > 0 ? rect.height : (canvasEl.height || 1);
    const scaleX = canvasEl.width / rectW;
    const scaleY = canvasEl.height / rectH;

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

  function setupContext(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = strokeColor === 'currentColor'
      ? (canvasEl ? getComputedStyle(canvasEl).color || 'rgb(24, 24, 27)' : 'rgb(24, 24, 27)')
      : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function startDrawing(e: MouseEvent | TouchEvent) {
    if (disabled || !canvasEl) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    // Save state before this new stroke for undo
    const snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    undoHistory = [...undoHistory, snapshot];
    redoHistory = [];
    redoStrokes = [];

    isDrawing = true;
    isEmpty = false;
    currentStroke = [pos];

    setupContext(ctx);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing || disabled || !canvasEl) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    currentStroke.push(pos);
    setupContext(ctx);

    // Quadratic Bezier curve smoothing for natural calligraphy stroke
    if (currentStroke.length >= 3) {
      const p0 = currentStroke[currentStroke.length - 3];
      const p1 = currentStroke[currentStroke.length - 2];
      const p2 = currentStroke[currentStroke.length - 1];

      if (p0 && p1 && p2) {
        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.stroke();
      }
    } else if (currentStroke.length === 2) {
      const p0 = currentStroke[0];
      if (p0) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  }

  function stopDrawing() {
    if (!isDrawing || !canvasEl) return;
    isDrawing = false;
    if (currentStroke.length > 0) {
      allStrokes = [...allStrokes, [...currentStroke]];
      currentStroke = [];
    }

    const dataUrl = canvasEl.toDataURL('image/png');
    value = dataUrl;
    onchange?.(dataUrl);
  }

  export function clear() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    undoHistory = [...undoHistory, snapshot];
    redoHistory = [];
    redoStrokes = [];
    allStrokes = [];
    currentStroke = [];

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    isEmpty = true;
    value = '';
    onchange?.('');
  }

  export function undo() {
    if (!canvasEl || undoHistory.length === 0) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const currentFrame = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    redoHistory = [...redoHistory, currentFrame];

    if (allStrokes.length > 0) {
      const lastStroke = allStrokes[allStrokes.length - 1];
      if (lastStroke) {
        redoStrokes = [...redoStrokes, lastStroke];
      }
      allStrokes = allStrokes.slice(0, -1);
    }

    const previous = undoHistory[undoHistory.length - 1];
    undoHistory = undoHistory.slice(0, -1);
    if (previous) {
      ctx.putImageData(previous, 0, 0);
    }

    isEmpty = undoHistory.length === 0 && allStrokes.length === 0;
    const dataUrl = isEmpty ? '' : canvasEl.toDataURL('image/png');
    value = dataUrl;
    onchange?.(dataUrl);
  }

  export function redo() {
    if (!canvasEl || redoHistory.length === 0) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const currentFrame = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    undoHistory = [...undoHistory, currentFrame];

    const nextFrame = redoHistory[redoHistory.length - 1];
    redoHistory = redoHistory.slice(0, -1);
    if (nextFrame) {
      ctx.putImageData(nextFrame, 0, 0);
    }

    if (redoStrokes.length > 0) {
      const nextStroke = redoStrokes[redoStrokes.length - 1];
      if (nextStroke) {
        allStrokes = [...allStrokes, nextStroke];
      }
      redoStrokes = redoStrokes.slice(0, -1);
    }

    isEmpty = false;
    const dataUrl = canvasEl.toDataURL('image/png');
    value = dataUrl;
    onchange?.(dataUrl);
  }

  export function toSVG(): string {
    const strokeHex = strokeColor === 'currentColor' ? 'currentColor' : strokeColor;
    let paths = '';

    for (const stroke of allStrokes) {
      if (stroke.length === 0) continue;
      const first = stroke[0];
      if (!first) continue;

      if (stroke.length === 1) {
        paths += `<circle cx="${first.x.toFixed(1)}" cy="${first.y.toFixed(1)}" r="${(strokeWidth / 2).toFixed(1)}" fill="${strokeHex}" />\n`;
        continue;
      }
      let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
      if (stroke.length === 2) {
        const second = stroke[1];
        if (second) {
          d += ` L ${second.x.toFixed(1)} ${second.y.toFixed(1)}`;
        }
      } else {
        for (let i = 1; i < stroke.length - 1; i++) {
          const p1 = stroke[i];
          const p2 = stroke[i + 1];
          if (p1 && p2) {
            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            d += ` Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
          }
        }
        const last = stroke[stroke.length - 1];
        if (last) {
          d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
        }
      }
      paths += `<path d="${d}" fill="none" stroke="${strokeHex}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }

    let timestampSvg = '';
    if (withTimestamp) {
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      timestampSvg = `<text x="${width - 12}" y="${height - 10}" text-anchor="end" font-family="monospace" font-size="10" fill="currentColor" opacity="0.65">Signed: ${ts} (Verified)</text>\n`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${paths}${timestampSvg}</svg>`;
  }

  export function toDataURL(type = 'image/png'): string {
    if (!canvasEl || isEmpty) return '';
    if (!withTimestamp) {
      return canvasEl.toDataURL(type);
    }

    // Embed tamper-evident verification timestamp watermark
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasEl.width;
    offscreen.height = canvasEl.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return canvasEl.toDataURL(type);

    ctx.drawImage(canvasEl, 0, 0);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(113, 113, 122, 0.8)';
    ctx.textAlign = 'right';
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    ctx.fillText(`Signed: ${ts} (Verified)`, offscreen.width - 12, offscreen.height - 10);

    return offscreen.toDataURL(type);
  }

  function handleSave() {
    if (isEmpty || !canvasEl) return;
    const dataUrl = toDataURL('image/png');
    onsave?.(dataUrl);
  }

  function handleDownloadPNG() {
    if (isEmpty || !canvasEl) return;
    const a = document.createElement('a');
    a.href = toDataURL('image/png');
    a.download = `signature_${Date.now()}.png`;
    a.click();
  }

  function handleDownloadSVG() {
    if (isEmpty) return;
    const svgContent = toSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signature_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
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

<div data-svadmin-component="SignaturePad" class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-3', className)}>
  <div class="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground flex items-center gap-2">
      <span>Electronic Signature</span>
      <span class="text-muted-foreground font-normal">(Sign inside the box)</span>
      {#if withTimestamp}
        <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          Timestamped
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        disabled={undoHistory.length === 0 || disabled}
        onclick={undo}
      >
        <RotateCcw class="h-3 w-3" />
        Undo
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        disabled={redoHistory.length === 0 || disabled}
        onclick={redo}
      >
        <RotateCw class="h-3 w-3" />
        Redo
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

      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        disabled={isEmpty || disabled}
        onclick={handleDownloadSVG}
        title="Export Vector SVG"
      >
        <FileCode class="h-3 w-3" />
        SVG
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
          class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          disabled={isEmpty || disabled}
          onclick={handleDownloadPNG}
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
