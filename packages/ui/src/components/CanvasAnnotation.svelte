<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from './ui/button/index.js';
  import {
    Pencil,
    Square,
    Circle,
    MoveUpRight,
    Type,
    Eraser,
    RotateCcw,
    Trash2,
    Download,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type AnnotationTool = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'eraser';

  interface Props {
    imageUrl?: string;
    width?: number;
    height?: number;
    activeTool?: AnnotationTool;
    strokeWidth?: number;
    onchange?: (dataUrl: string) => void;
    onexport?: (dataUrl: string) => void;
    class?: string;
  }

  let {
    imageUrl = '',
    width = 700,
    height = 450,
    activeTool = $bindable('pen'),
    strokeWidth = 3,
    onchange,
    onexport,
    class: className = '',
  }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let isDrawing = $state(false);
  let startX = 0;
  let startY = 0;
  let history = $state<ImageData[]>([]);
  let bgImage: HTMLImageElement | null = null;
  let textInputPrompt = $state('');
  let showTextPrompt = $state(false);
  let textPos = $state({ x: 0, y: 0 });

  interface Point {
    x: number;
    y: number;
  }

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

  function saveHistory() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      history = [...history, ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)];
    }
  }

  function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
    const headlen = 12;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  function startAction(e: MouseEvent | TouchEvent) {
    if (!canvasEl) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    if (activeTool === 'text') {
      textPos = pos;
      showTextPrompt = true;
      return;
    }

    saveHistory();
    isDrawing = true;
    startX = pos.x;
    startY = pos.y;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getComputedStyle(canvasEl).color || 'rgb(225, 29, 72)';
    }

    if (activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function handleMove(e: MouseEvent | TouchEvent) {
    if (!isDrawing || !canvasEl) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') {
      const last = history[history.length - 1];
      if (last) {
        ctx.putImageData(last, 0, 0);
      }
      ctx.strokeStyle = getComputedStyle(canvasEl).color || 'rgb(225, 29, 72)';
      ctx.lineWidth = strokeWidth;

      if (activeTool === 'rect') {
        ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(pos.x - startX) / 2;
        const ry = Math.abs(pos.y - startY) / 2;
        const cx = Math.min(startX, pos.x) + rx;
        const cy = Math.min(startY, pos.y) + ry;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        drawArrow(ctx, startX, startY, pos.x, pos.y);
      }
    }
  }

  function stopAction() {
    if (!isDrawing || !canvasEl) return;
    isDrawing = false;
    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over';
    }
    const dataUrl = canvasEl.toDataURL('image/png');
    onchange?.(dataUrl);
  }

  function submitText() {
    if (!canvasEl || !textInputPrompt.trim()) {
      showTextPrompt = false;
      textInputPrompt = '';
      return;
    }
    saveHistory();
    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      ctx.fillStyle = getComputedStyle(canvasEl).color || 'rgb(225, 29, 72)';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(textInputPrompt.trim(), textPos.x, textPos.y);
    }
    showTextPrompt = false;
    textInputPrompt = '';
    const dataUrl = canvasEl.toDataURL('image/png');
    onchange?.(dataUrl);
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
    const dataUrl = canvasEl.toDataURL('image/png');
    onchange?.(dataUrl);
  }

  export function clear() {
    if (!canvasEl) return;
    saveHistory();
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvasEl.width, canvasEl.height);
    }
    const dataUrl = canvasEl.toDataURL('image/png');
    onchange?.(dataUrl);
  }

  function handleExport() {
    if (!canvasEl) return;
    const dataUrl = canvasEl.toDataURL('image/png');
    onexport?.(dataUrl);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `annotation_${Date.now()}.png`;
    a.click();
  }

  function redrawBg() {
    if (!canvasEl || !imageUrl) return;
    bgImage = new Image();
    bgImage.crossOrigin = 'anonymous';
    bgImage.onload = () => {
      if (!canvasEl) return;
      const ctx = canvasEl.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        if (bgImage) ctx.drawImage(bgImage, 0, 0, canvasEl.width, canvasEl.height);
      }
    };
    bgImage.src = imageUrl;
  }

  onMount(() => {
    redrawBg();
  });
</script>

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-3', className)}>
  <!-- Header & Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
      <Button
        variant={activeTool === 'pen' ? 'default' : 'ghost'}
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { activeTool = 'pen'; }}
        title="Pen"
      >
        <Pencil class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={activeTool === 'rect' ? 'default' : 'ghost'}
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { activeTool = 'rect'; }}
        title="Rectangle"
      >
        <Square class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={activeTool === 'circle' ? 'default' : 'ghost'}
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { activeTool = 'circle'; }}
        title="Circle"
      >
        <Circle class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={activeTool === 'arrow' ? 'default' : 'ghost'}
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { activeTool = 'arrow'; }}
        title="Arrow"
      >
        <MoveUpRight class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={activeTool === 'text' ? 'default' : 'ghost'}
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { activeTool = 'text'; }}
        title="Text Note"
      >
        <Type class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={activeTool === 'eraser' ? 'default' : 'ghost'}
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { activeTool = 'eraser'; }}
        title="Eraser"
      >
        <Eraser class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        disabled={history.length === 0}
        onclick={undo}
      >
        <RotateCcw class="h-3 w-3" />
        Undo
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onclick={clear}
      >
        <Trash2 class="h-3 w-3" />
        Clear
      </Button>

      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1"
        onclick={handleExport}
      >
        <Download class="h-3 w-3" />
        Export
      </Button>
    </div>
  </div>

  <!-- Canvas Container -->
  <div class="relative w-full rounded-lg border border-border/80 bg-muted/20 overflow-hidden flex items-center justify-center">
    <canvas
      bind:this={canvasEl}
      {width}
      {height}
      class="touch-none cursor-crosshair max-w-full h-auto block bg-card"
      onmousedown={startAction}
      onmousemove={handleMove}
      onmouseup={stopAction}
      onmouseleave={stopAction}
      ontouchstart={(e) => { e.preventDefault(); startAction(e); }}
      ontouchmove={(e) => { e.preventDefault(); handleMove(e); }}
      ontouchend={(e) => { e.preventDefault(); stopAction(); }}
    ></canvas>

    {#if showTextPrompt}
      <div
        class="absolute z-50 p-2 rounded-lg border border-border bg-popover shadow-md flex items-center gap-1.5"
        style={`left: ${Math.min(textPos.x, width - 180)}px; top: ${Math.min(textPos.y, height - 50)}px;`}
      >
        <input
          type="text"
          bind:value={textInputPrompt}
          placeholder="Annotation text..."
          class="h-7 w-36 rounded border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onkeydown={(e) => {
            if (e.key === 'Enter') submitText();
            else if (e.key === 'Escape') showTextPrompt = false;
          }}
        />
        <Button size="sm" class="h-7 text-xs px-2" onclick={submitText}>Add</Button>
      </div>
    {/if}
  </div>
</div>
