<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { RotateCw, ZoomIn, ZoomOut, Crop } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    imageUrl: string;
    aspectRatio?: number;
    zoom?: number;
    rotation?: number;
    oncrop?: (croppedDataUrl: string) => void;
    oncancel?: () => void;
    class?: string;
  }

  let {
    imageUrl,
    aspectRatio = 1,
    zoom = $bindable(1),
    rotation = $bindable(0),
    oncrop,
    oncancel,
    class: className = '',
  }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);

  function handleRotate() {
    rotation = (rotation + 90) % 360;
  }

  function handleCrop() {
    if (!canvasEl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvasEl?.getContext('2d');
      if (!ctx || !canvasEl) return;

      const size = 300;
      canvasEl.width = size;
      canvasEl.height = size / aspectRatio;

      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.save();
      ctx.translate(canvasEl.width / 2, canvasEl.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -size / 2, (-size / 2) / aspectRatio, size, size / aspectRatio);
      ctx.restore();

      const dataUrl = canvasEl.toDataURL('image/png');
      oncrop?.(dataUrl);
    };
    img.src = imageUrl;
  }
</script>

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs space-y-4 text-xs', className)}>
  <div class="flex items-center justify-between pb-2 border-b border-border/60">
    <h4 class="font-semibold text-foreground flex items-center gap-1.5">
      <Crop class="h-4 w-4 text-primary" />
      Image Cropper
    </h4>
  </div>

  <!-- Crop Viewport -->
  <div class="relative flex items-center justify-center h-64 w-full rounded-lg bg-muted/40 border border-border/60 overflow-hidden select-none">
    <div
      style="transform: scale({zoom}) rotate({rotation}deg); transition: transform 150ms ease;"
      class="max-h-56 max-w-56 flex items-center justify-center"
    >
      <img src={imageUrl} alt="Crop Preview" class="object-contain max-h-56 max-w-56 rounded pointer-events-none" />
    </div>

    <!-- Aspect Ratio Overlay Grid -->
    <div
      style="aspect-ratio: {aspectRatio};"
      class="absolute w-48 border-2 border-primary/80 rounded pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
    ></div>
  </div>

  <!-- Controls Bar -->
  <div class="flex items-center justify-between gap-3 pt-2">
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1"
        onclick={() => { zoom = Math.max(0.5, Number((zoom - 0.1).toFixed(1))); }}
      >
        <ZoomOut class="h-3 w-3" />
      </Button>
      <span class="tabular-nums font-mono text-[11px] text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1"
        onclick={() => { zoom = Math.min(3, Number((zoom + 0.1).toFixed(1))); }}
      >
        <ZoomIn class="h-3 w-3" />
      </Button>

      <Button variant="outline" size="sm" class="h-7 text-xs gap-1 ml-2" onclick={handleRotate}>
        <RotateCw class="h-3 w-3" />
        Rotate
      </Button>
    </div>

    <div class="flex items-center gap-2">
      {#if oncancel}
        <Button variant="outline" size="sm" class="h-7 text-xs" onclick={oncancel}>Cancel</Button>
      {/if}
      <Button size="sm" class="h-7 text-xs gap-1" onclick={handleCrop}>
        Apply Crop
      </Button>
    </div>
  </div>

  <!-- Hidden Working Canvas -->
  <canvas bind:this={canvasEl} class="hidden"></canvas>
</div>
