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

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-3e7ce58d64fa svadmin-u-359090c2d529', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <h4 class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Crop class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1" />
      Image Cropper
    </h4>
  </div>

  <!-- Crop Viewport -->
  <div class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-14ce684b980b svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-b00f43c30c2b svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-2cd02d11d1af svadmin-u-7f6912283f11">
    <div
      style="transform: scale({zoom}) rotate({rotation}deg); transition: transform 150ms ease;"
      class="svadmin-u-520bb7118c41 svadmin-u-0497cfa907ee svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227"
    >
      <img src={imageUrl} alt="Crop Preview" class="svadmin-u-b1104f41444a svadmin-u-520bb7118c41 svadmin-u-0497cfa907ee svadmin-u-07389a777c1f svadmin-u-a4326536b8f5" />
    </div>

    <!-- Aspect Ratio Overlay Grid -->
    <div
      style="aspect-ratio: {aspectRatio};"
      class="svadmin-u-da4dbfbc4fdc svadmin-u-74b2435a1d40 svadmin-u-65935df577ba svadmin-u-a127a4f41a7d svadmin-u-07389a777c1f svadmin-u-a4326536b8f5 svadmin-u-09deafdfd7f5"
    ></div>
  </div>

  <!-- Controls Bar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-f46b61a9b310">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <Button
        variant="outline"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421"
        onclick={() => { zoom = Math.max(0.5, Number((zoom - 0.1).toFixed(1))); }}
      >
        <ZoomOut class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </Button>
      <span class="svadmin-u-3032cae0badb svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-d854e5698b57 svadmin-u-ca6bf63030aa">{Math.round(zoom * 100)}%</span>
      <Button
        variant="outline"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421"
        onclick={() => { zoom = Math.min(3, Number((zoom + 0.1).toFixed(1))); }}
      >
        <ZoomIn class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </Button>

      <Button variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-c68af9986751" onclick={handleRotate}>
        <RotateCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Rotate
      </Button>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      {#if oncancel}
        <Button variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529" onclick={oncancel}>Cancel</Button>
      {/if}
      <Button size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={handleCrop}>
        Apply Crop
      </Button>
    </div>
  </div>

  <!-- Hidden Working Canvas -->
  <canvas bind:this={canvasEl} class="svadmin-u-99d72c7fc3e2"></canvas>
</div>
