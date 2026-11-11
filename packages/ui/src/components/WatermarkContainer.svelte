<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface WatermarkContainerProps {
    content?: string | string[];
    image?: string;
    width?: number;
    height?: number;
    rotate?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    gapX?: number;
    gapY?: number;
    zIndex?: number;
    antiTamper?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    content = 'CONFIDENTIAL',
    image,
    width = 240,
    height = 140,
    rotate = -22,
    fontSize = 14,
    fontFamily = 'sans-serif',
    color = 'rgba(128, 128, 128, 0.18)',
    gapX = 48,
    gapY = 48,
    zIndex = 9999,
    antiTamper = true,
    class: className = '',
    children,
  }: WatermarkContainerProps = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let overlayEl = $state<HTMLDivElement | null>(null);
  let watermarkDataUrl = $state<string>('');

  let observer: MutationObserver | null = null;

  function renderWatermarkCanvas(): string {
    if (typeof document === 'undefined') return '';

    try {
      const canvas = document.createElement('canvas');
      const totalWidth = width + gapX;
      const totalHeight = height + gapY;

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      canvas.width = totalWidth * dpr;
      canvas.height = totalHeight * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.scale(dpr, dpr);
      ctx.translate(totalWidth / 2, totalHeight / 2);
      ctx.rotate((rotate * Math.PI) / 180);

      if (image) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = image;
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        return typeof canvas.toDataURL === 'function' ? canvas.toDataURL() : '';
      }

      const lines = Array.isArray(content) ? content : [content];
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lineHeight = fontSize * 1.4;
      const initialY = -((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, 0, initialY + index * lineHeight);
      });

      return typeof canvas.toDataURL === 'function' ? canvas.toDataURL() : '';
    } catch {
      return '';
    }
  }

  function applyOverlayStyle() {
    if (!overlayEl) return;
    overlayEl.style.position = 'absolute';
    overlayEl.style.top = '0';
    overlayEl.style.left = '0';
    overlayEl.style.width = '100%';
    overlayEl.style.height = '100%';
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.zIndex = String(zIndex);
    overlayEl.style.backgroundRepeat = 'repeat';
    overlayEl.style.display = 'block';
    overlayEl.style.visibility = 'visible';
    overlayEl.style.opacity = '1';
    if (watermarkDataUrl) {
      overlayEl.style.backgroundImage = `url("${watermarkDataUrl}")`;
      overlayEl.style.backgroundSize = `${width + gapX}px ${height + gapY}px`;
    }
  }

  function reobserve() {
    if (!observer || !containerEl || !overlayEl) return;
    observer.observe(containerEl, {
      childList: true,
      subtree: false,
    });
    observer.observe(overlayEl, {
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });
  }

  function setupAntiTamper() {
    if (!antiTamper || typeof MutationObserver === 'undefined' || !containerEl || !overlayEl) return;

    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
      if (!containerEl || !overlayEl) return;

      let needRestore = false;

      for (const m of mutations) {
        if (m.type === 'childList') {
          if (!containerEl.contains(overlayEl)) {
            needRestore = true;
            break;
          }
        } else if (m.type === 'attributes' && m.target === overlayEl) {
          const style = overlayEl.getAttribute('style') || '';
          if (
            style.includes('display: none') ||
            style.includes('visibility: hidden') ||
            style.includes('opacity: 0') ||
            !style.includes('pointer-events: none')
          ) {
            needRestore = true;
            break;
          }
        }
      }

      if (needRestore) {
        observer?.disconnect();
        if (!containerEl.contains(overlayEl)) {
          // eslint-disable-next-line svelte/no-dom-manipulating -- Anti-tamper security restores overlay when removed by client
          containerEl.appendChild(overlayEl);
        }
        applyOverlayStyle();
        reobserve();
      }
    });

    reobserve();
  }

  $effect(() => {
    // Access props to track reactivity
    void [content, image, width, height, rotate, fontSize, fontFamily, color, gapX, gapY];
    watermarkDataUrl = renderWatermarkCanvas();
    applyOverlayStyle();
  });

  onMount(() => {
    watermarkDataUrl = renderWatermarkCanvas();
    applyOverlayStyle();
    setupAntiTamper();
  });

  onDestroy(() => {
    observer?.disconnect();
    observer = null;
  });
</script>

<div
  bind:this={containerEl}
  class={cn('relative overflow-hidden', className)}
  data-svadmin-component="WatermarkContainer"
>
  {@render children?.()}
  <div
    bind:this={overlayEl}
    class="pointer-events-none absolute inset-0 select-none"
    data-svadmin-watermark-overlay="true"
    aria-hidden="true"
  ></div>
</div>
