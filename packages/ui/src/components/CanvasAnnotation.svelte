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

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6ed543e2fbbb', className)}>
  <!-- Header & Toolbar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-b00f43c30c2b svadmin-u-eb6a3cef9686 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
      <Button
        variant={activeTool === 'pen' ? 'default' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { activeTool = 'pen'; }}
        title="Pen"
      >
        <Pencil class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button
        variant={activeTool === 'rect' ? 'default' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { activeTool = 'rect'; }}
        title="Rectangle"
      >
        <Square class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button
        variant={activeTool === 'circle' ? 'default' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { activeTool = 'circle'; }}
        title="Circle"
      >
        <Circle class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button
        variant={activeTool === 'arrow' ? 'default' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { activeTool = 'arrow'; }}
        title="Arrow"
      >
        <MoveUpRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button
        variant={activeTool === 'text' ? 'default' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { activeTool = 'text'; }}
        title="Text Note"
      >
        <Type class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button
        variant={activeTool === 'eraser' ? 'default' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { activeTool = 'eraser'; }}
        title="Eraser"
      >
        <Eraser class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
        disabled={history.length === 0}
        onclick={undo}
      >
        <RotateCcw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Undo
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2 svadmin-u-8db899b4e072"
        onclick={clear}
      >
        <Trash2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Clear
      </Button>

      <Button
        variant="outline"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421"
        onclick={handleExport}
      >
        <Download class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Export
      </Button>
    </div>
  </div>

  <!-- Canvas Container -->
  <div class="svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-c9ed8c5f79ae svadmin-u-967d113a1451 svadmin-u-2cd02d11d1af svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227">
    <canvas
      bind:this={canvasEl}
      {width}
      {height}
      class="touch-none svadmin-u-92b7f35f04c0 svadmin-u-c0980a65a70d svadmin-u-b8f0a08ece1e svadmin-u-0214b4b355d1 svadmin-u-cd0ad9a56558"
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
        class="svadmin-u-da4dbfbc4fdc svadmin-u-181b286668b5 svadmin-u-7660b450905a svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-e541d86d1ec8 svadmin-u-febc34e471df svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"
        style={`left: ${Math.min(textPos.x, width - 180)}px; top: ${Math.min(textPos.y, height - 50)}px;`}
      >
        <input
          type="text"
          bind:value={textInputPrompt}
          placeholder="Annotation text..."
          class="svadmin-u-d0a52b312f7d svadmin-u-df403bbae8fc svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          onkeydown={(e) => {
            if (e.key === 'Enter') submitText();
            else if (e.key === 'Escape') showTextPrompt = false;
          }}
        />
        <Button size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-d5eab218aa34" onclick={submitText}>Add</Button>
      </div>
    {/if}
  </div>
</div>
