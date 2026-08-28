<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface WatermarkFont {
    color?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'light' | 'weight' | 'bold' | number;
    fontFamily?: string;
    fontStyle?: 'none' | 'normal' | 'italic' | 'oblique';
  }

  interface Props {
    content?: string | string[];
    image?: string;
    width?: number;
    height?: number;
    rotate?: number;
    zIndex?: number;
    gap?: [number, number];
    offset?: [number, number];
    opacity?: number;
    font?: WatermarkFont;
    antiTamper?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    content = 'CONFIDENTIAL',
    image,
    width = 120,
    height = 64,
    rotate = -22,
    zIndex = 9,
    gap = [100, 100],
    offset = [gap[0] / 2, gap[1] / 2],
    opacity = 0.12,
    font = {},
    antiTamper = true,
    class: className = '',
    children,
  }: Props = $props();

  let containerEl: HTMLDivElement | null = $state(null);
  let base64Url = $state<string>('');
  let watermarkRevision = $state(0);
  let observer: MutationObserver | null = null;
  let isCleaningUp = false;

  function renderWatermark() {
    if (typeof window === 'undefined') return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const [gapX, gapY] = gap;
    const canvasWidth = (gapX + width) * ratio;
    const canvasHeight = (gapY + height) * ratio;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${gapX + width}px`;
    canvas.style.height = `${gapY + height}px`;

    ctx.scale(ratio, ratio);
    ctx.translate(offset[0], offset[1]);
    ctx.rotate((rotate * Math.PI) / 180);

    if (image) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        base64Url = canvas.toDataURL();
      };
      img.src = image;
    } else {
      const {
        fontSize = 14,
        fontFamily = 'sans-serif',
        fontWeight = 'normal',
        fontStyle = 'normal',
        color = 'currentColor',
      } = font;

      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color === 'currentColor' ? 'rgba(128, 128, 128, 0.85)' : color;
      ctx.globalAlpha = opacity;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      const contents = Array.isArray(content) ? content : [content];
      const lineHeight = fontSize + 4;
      const totalHeight = contents.length * lineHeight;
      const startY = -(totalHeight / 2) + lineHeight / 2;

      contents.forEach((text, i) => {
        ctx.fillText(text, 0, startY + i * lineHeight);
      });

      base64Url = canvas.toDataURL();
    }
  }

  $effect(() => {
    // Re-generate watermark when inputs change
    if (content || image || width || height || rotate || gap || offset || opacity || font) {
      renderWatermark();
    }
  });

  onMount(() => {
    renderWatermark();

    if (antiTamper && typeof MutationObserver !== 'undefined' && containerEl) {
      observer = new MutationObserver((mutations) => {
        if (isCleaningUp) return;
        for (const mutation of mutations) {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            watermarkRevision += 1;
            break;
          }
        }
      });

      observer.observe(containerEl, {
        attributes: true,
        subtree: true,
        childList: true,
        attributeFilter: ['style', 'class', 'hidden'],
      });
    }
  });

  onDestroy(() => {
    isCleaningUp = true;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });
</script>

<div
  bind:this={containerEl}
  class={cn('relative overflow-hidden', className)}
  data-svadmin-watermark-wrapper
>
  {#key watermarkRevision}
    {#if base64Url}
      <div
        data-svadmin-watermark
        class="absolute inset-0 pointer-events-none"
        style="z-index: {zIndex}; background-image: url('{base64Url}'); background-position: {offset[0]}px {offset[1]}px; background-repeat: repeat;"
      ></div>
    {/if}
  {/key}
  {#if children}
    {@render children()}
  {/if}
</div>
