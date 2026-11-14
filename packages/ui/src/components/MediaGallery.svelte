<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Dialog from './ui/dialog/index.js';

  export interface MediaGalleryItem {
    id: string | number;
    src: string;
    thumbSrc?: string;
    type?: 'image' | 'video' | 'audio' | 'document';
    title?: string;
    description?: string;
    size?: string;
    dimensions?: string;
    uploadDate?: string;
    uploader?: string;
    metadata?: Record<string, string>;
  }

  export interface MediaGalleryProps {
    items: MediaGalleryItem[];
    maxDisplay?: number;
    gridCols?: 2 | 3 | 4 | 6;
    watermarkText?: string;
    enableZoom?: boolean;
    enableRotate?: boolean;
    enableDownload?: boolean;
    enableMetadataDrawer?: boolean;
    class?: string;
    onItemClick?: (item: MediaGalleryItem, index: number) => void;
    onDownload?: (item: MediaGalleryItem) => void;
    customThumbnail?: Snippet<[{ item: MediaGalleryItem; index: number }]>;
  }

  const {
    items = [],
    maxDisplay = 9,
    gridCols = 3,
    watermarkText = '',
    enableZoom = true,
    enableRotate = true,
    enableDownload = true,
    enableMetadataDrawer = true,
    class: className = '',
    onItemClick,
    onDownload,
    customThumbnail,
  }: MediaGalleryProps = $props();

  let activeId = $state<MediaGalleryItem['id'] | null>(null);
  const activeIndex = $derived(activeId === null ? null : items.findIndex(item => item.id === activeId));
  let showDrawer = $state<boolean>(false);
  let scale = $state<number>(1);
  let rotate = $state<number>(0);
  let translateX = $state<number>(0);
  let translateY = $state<number>(0);
  let isDragging = $state<boolean>(false);
  let startX = $state<number>(0);
  let startY = $state<number>(0);

  const displayItems = $derived(
    items.length <= maxDisplay ? items : items.slice(0, maxDisplay)
  );

  const hiddenCount = $derived(
    items.length <= maxDisplay ? 0 : items.length - maxDisplay
  );

  const currentItem = $derived<MediaGalleryItem | null>(
    activeIndex !== null && activeIndex >= 0 && activeIndex < items.length
      ? items[activeIndex] ?? null
      : null
  );

  $effect(() => {
    if (activeIndex === -1) closeLightbox();
  });

  const gridClass = $derived(
    gridCols === 2
      ? 'grid-cols-2'
      : gridCols === 4
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        : gridCols === 6
          ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'
          : 'grid-cols-2 sm:grid-cols-3'
  );

  function openLightbox(index: number) {
    activeId = items[index]?.id ?? null;
    scale = 1;
    rotate = 0;
    translateX = 0;
    translateY = 0;
    const item = items[index];
    if (item) {
      onItemClick?.(item, index);
    }
  }

  function closeLightbox() {
    activeId = null;
    scale = 1;
    rotate = 0;
    translateX = 0;
    translateY = 0;
    showDrawer = false;
    isDragging = false;
  }

  function prevItem() {
    if (activeIndex === null || items.length === 0) return;
    activeId = items[(activeIndex - 1 + items.length) % items.length]?.id ?? null;
    scale = 1;
    rotate = 0;
    translateX = 0;
    translateY = 0;
  }

  function nextItem() {
    if (activeIndex === null || items.length === 0) return;
    activeId = items[(activeIndex + 1) % items.length]?.id ?? null;
    scale = 1;
    rotate = 0;
    translateX = 0;
    translateY = 0;
  }

  function zoomIn() {
    if (!enableZoom) return;
    scale = Math.min(5, Number((scale + 0.25).toFixed(2)));
  }

  function zoomOut() {
    if (!enableZoom) return;
    scale = Math.max(0.2, Number((scale - 0.25).toFixed(2)));
  }

  function resetZoom() {
    scale = 1;
    rotate = 0;
    translateX = 0;
    translateY = 0;
  }

  function rotateLeft() {
    if (!enableRotate) return;
    rotate = (rotate - 90) % 360;
  }

  function rotateRight() {
    if (!enableRotate) return;
    rotate = (rotate + 90) % 360;
  }

  function handleWheel(e: WheelEvent) {
    if (!enableZoom || activeIndex === null || (currentItem?.type && currentItem.type !== 'image')) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0 || scale <= 1 || (currentItem?.type && currentItem.type !== 'image')) return;
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (activeIndex === null || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const target = e.target;
    if (target instanceof Element && target.closest('video, audio, input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.key === 'ArrowLeft') prevItem();
      else nextItem();
    }
  }
  function downloadUrl(src: string): string | undefined {
    try {
      const url = new URL(src, typeof document === 'undefined' ? 'https://svadmin.invalid' : document.baseURI);
      return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : undefined;
    } catch { return undefined; }
  }

  function handleDownloadClick(item: MediaGalleryItem) {
    if (!enableDownload) return;
    if (onDownload) {
      onDownload(item);
      return;
    }
    const href = downloadUrl(item.src);
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = item.title || `media-${item.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div
  class="media-gallery relative w-full {className}"
  data-svadmin-component="MediaGallery"
>
  <!-- Grid thumbnails -->
  <div class="grid gap-3.5 {gridClass}">
    {#each displayItems as item, idx (item.id)}
      {@const isLastWithMore = idx === maxDisplay - 1 && hiddenCount > 0}
      <button
        type="button"
        aria-label={item.title || `预览媒体 ${item.id}`}
        class="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/30 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
        onclick={() => openLightbox(idx)}
      >
        {#if customThumbnail}
          {@render customThumbnail({ item, index: idx })}
        {:else if item.type === 'video'}
          <div class="flex h-full w-full items-center justify-center bg-card">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </div>
        {:else if item.type === 'audio'}
          <div class="flex h-full w-full flex-col items-center justify-center bg-card p-3 text-center">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <svg class="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </span>
            <span class="mt-2 line-clamp-1 text-xs font-medium text-foreground">{item.title || '音频文件'}</span>
          </div>
        {:else if item.type === 'document'}
          <div class="flex h-full w-full flex-col items-center justify-center bg-card p-3 text-center">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <svg class="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            <span class="mt-2 line-clamp-1 text-xs font-medium text-foreground">{item.title || '文档'}</span>
          </div>
        {:else}
          <img
            src={item.thumbSrc || item.src}
            alt={item.title || '媒体文件'}
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        {/if}

        <!-- Hover caption badge -->
        {#if item.title && !isLastWithMore}
          <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <p class="truncate text-xs font-medium text-foreground">{item.title}</p>
          </div>
        {/if}

        <!-- Overflow Badge -->
        {#if isLastWithMore}
          <div class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs">
            <span class="text-xl font-bold tracking-tight text-primary">+{hiddenCount + 1}</span>
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Lightbox Modal -->
  <Dialog.Root open={currentItem !== null} onOpenChange={(value) => { if (!value) closeLightbox(); }}>
  {#if activeIndex !== null && currentItem}
    {@const item = currentItem}
    <Dialog.Content
      showCloseButton={false}
      class="flex flex-col bg-background/95 backdrop-blur-md"
      style="inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; transform: none; padding: 0; gap: 0; border-radius: 0;"
      onkeydown={handleKeyDown}
    >
      <!-- Watermark Protection Layer -->
      {#if watermarkText}
        <div class="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-10">
          <div class="grid h-full w-full grid-cols-3 items-center justify-items-center gap-12 p-8 sm:grid-cols-4">
            {#each Array(16) as _, i (i)}
              <div class="rotate-[-25deg] text-base font-semibold tracking-widest text-foreground">
                {watermarkText}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Top Toolbar -->
      <div class="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <!-- Title & Counter -->
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold tabular-nums text-muted-foreground">
            {activeIndex + 1} / {items.length}
          </span>
          <Dialog.Title class="max-w-[200px] truncate text-sm font-medium text-foreground sm:max-w-md">
            {item.title || `媒体资源 #${item.id}`}
          </Dialog.Title>
          <Dialog.Description class="sr-only">媒体预览，可查看详情并切换资源</Dialog.Description>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-1 sm:gap-2">
          {#if enableZoom && item.type !== 'video' && item.type !== 'audio' && item.type !== 'document'}
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="缩小 (Zoom Out)"
              onclick={zoomOut}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>
            </button>
            <button
              type="button"
              class="px-1.5 py-1 text-xs font-mono font-medium text-muted-foreground hover:text-foreground"
              title="双击或点击复位 (Reset)"
              onclick={resetZoom}
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="放大 (Zoom In)"
              onclick={zoomIn}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
          {/if}

          {#if enableRotate && item.type !== 'video' && item.type !== 'audio' && item.type !== 'document'}
            <div class="h-4 w-px bg-border"></div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="向左旋转 90°"
              onclick={rotateLeft}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4" /></svg>
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="向右旋转 90°"
              onclick={rotateRight}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" /></svg>
            </button>
          {/if}

          {#if enableDownload}
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="下载文件"
              disabled={!onDownload && !downloadUrl(item.src)}
              onclick={() => handleDownloadClick(item)}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          {/if}

          {#if enableMetadataDrawer}
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors {showDrawer ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
              title="详情信息"
              onclick={() => (showDrawer = !showDrawer)}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          {/if}

          <div class="h-4 w-px bg-border"></div>

          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="关闭 (Esc)"
            onclick={closeLightbox}
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- Main Stage Area -->
      <div class="relative flex flex-1 items-stretch overflow-hidden">
        <!-- Navigation Prev -->
        {#if items.length > 1}
          <button
            type="button"
            class="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-md backdrop-blur-xs transition-all hover:bg-background hover:scale-105 active:scale-95"
            title="上一张 (←)"
            onclick={prevItem}
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        {/if}

        <!-- Center Viewport -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="relative flex flex-1 items-center justify-center overflow-hidden p-4 select-none"
          onwheel={handleWheel}
          onmousedown={handleMouseDown}
          ondblclick={resetZoom}
          role="region"
          aria-label="媒体视口"
        >
          {#if item.type === 'video'}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video
              src={item.src}
              controls
              autoplay
              class="max-h-[85vh] max-w-full rounded-lg shadow-xl"
            ></video>
          {:else if item.type === 'audio'}
            <div class="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
              <span class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-primary">
                <svg class="h-10 w-10 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </span>
              <div class="text-center">
                <h4 class="text-base font-semibold text-foreground">{item.title || '音频'}</h4>
                <p class="text-xs text-muted-foreground">{item.uploader || '企业多媒体'}</p>
              </div>
              <audio src={item.src} controls class="w-72 sm:w-80"></audio>
            </div>
          {:else if item.type === 'document'}
            <div class="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
              <span class="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <svg class="h-10 w-10 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </span>
              <h4 class="text-base font-semibold text-foreground">{item.title || '文档文件'}</h4>
              <p class="text-xs text-muted-foreground">该文件暂不支持内嵌预览，请下载查看</p>
              {#if enableDownload}
              <button
                type="button"
                disabled={!onDownload && !downloadUrl(item.src)}
                class="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                onclick={() => handleDownloadClick(item)}
              >
                下载此文档
              </button>
              {/if}
            </div>
          {:else}
            <!-- Image with interactive scale & rotate -->
            <img
              src={item.src}
              alt={item.title || '媒体大图'}
              class="max-h-[85vh] max-w-full rounded-md shadow-2xl transition-transform duration-75 {isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-default'}"
              style="transform: translate({translateX}px, {translateY}px) scale({scale}) rotate({rotate}deg);"
              draggable="false"
            />
          {/if}
        </div>

        <!-- Navigation Next -->
        {#if items.length > 1}
          <button
            type="button"
            class="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-md backdrop-blur-xs transition-all hover:bg-background hover:scale-105 active:scale-95"
            title="下一张 (→)"
            onclick={nextItem}
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        {/if}

        <!-- Right Metadata Drawer -->
        {#if showDrawer}
          <aside class="relative z-20 flex w-72 sm:w-80 flex-col border-l border-border bg-card/95 p-4 backdrop-blur-sm transition-all duration-200">
            <div class="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <h3 class="text-sm font-semibold text-foreground">资源元数据</h3>
              <button
                type="button"
                class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="关闭信息抽屉"
                onclick={() => (showDrawer = false)}
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto text-xs">
              <div>
                <span class="text-muted-foreground">文件名称</span>
                <p class="mt-0.5 break-all font-medium text-foreground">{item.title || `媒体 #${item.id}`}</p>
              </div>

              {#if item.description}
                <div>
                  <span class="text-muted-foreground">详细说明</span>
                  <p class="mt-0.5 text-foreground">{item.description}</p>
                </div>
              {/if}

              <div>
                <span class="text-muted-foreground">资源类型</span>
                <p class="mt-0.5 font-medium uppercase text-foreground">{item.type || 'IMAGE'}</p>
              </div>

              {#if item.dimensions}
                <div>
                  <span class="text-muted-foreground">图像分辨率</span>
                  <p class="mt-0.5 font-mono text-foreground">{item.dimensions}</p>
                </div>
              {/if}

              {#if item.size}
                <div>
                  <span class="text-muted-foreground">文件大小</span>
                  <p class="mt-0.5 font-mono text-foreground">{item.size}</p>
                </div>
              {/if}

              {#if item.uploadDate}
                <div>
                  <span class="text-muted-foreground">上传时间</span>
                  <p class="mt-0.5 font-mono text-foreground">{item.uploadDate}</p>
                </div>
              {/if}

              {#if item.uploader}
                <div>
                  <span class="text-muted-foreground">操作人员</span>
                  <p class="mt-0.5 text-foreground">{item.uploader}</p>
                </div>
              {/if}

              {#if item.metadata && Object.keys(item.metadata).length > 0}
                <div class="border-t border-border/60 pt-3">
                  <span class="font-medium text-foreground">自定义扩展属性</span>
                  <dl class="mt-2 space-y-1.5">
                    {#each Object.entries(item.metadata) as [k, v] (k)}
                      <div class="flex justify-between gap-2">
                        <dt class="text-muted-foreground">{k}:</dt>
                        <dd class="truncate font-mono text-foreground" title={String(v)}>{String(v)}</dd>
                      </div>
                    {/each}
                  </dl>
                </div>
              {/if}
            </div>
          </aside>
        {/if}
      </div>
    </Dialog.Content>
  {/if}
  </Dialog.Root>
</div>
