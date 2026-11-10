<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { RotateCw, Check, X, ChevronsRight } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  export interface SliderCaptchaResult {
    token: string;
    elapsedMs: number;
  }

  export interface SliderCaptchaProps {
    width?: number | undefined;
    height?: number | undefined;
    puzzleSize?: number | undefined;
    tolerance?: number | undefined;
    minTimeMs?: number | undefined;
    maxTimeMs?: number | undefined;
    bgImage?: string | undefined;
    text?: string | undefined;
    successText?: string | undefined;
    failText?: string | undefined;
    disabled?: boolean | undefined;
    class?: string | undefined;
    onsuccess?: ((result: SliderCaptchaResult) => void) | undefined;
    onfail?: (() => void) | undefined;
    onrefresh?: (() => void) | undefined;
  }

  let {
    width = 320,
    height = 160,
    puzzleSize = 42,
    tolerance = 5,
    minTimeMs = 200,
    maxTimeMs = 10000,
    bgImage,
    text,
    successText,
    failText,
    disabled = false,
    class: className = '',
    onsuccess,
    onfail,
    onrefresh,
  }: SliderCaptchaProps = $props();

  const i18n = useTranslation();

  function t(key: string, fallback: string): string {
    const val = i18n.t(key);
    return !val || val === key ? fallback : val;
  }

  const radius = 8; // 拼图凹凸圆弧半径
  const handleWidth = 40;
  const maxSlide = $derived(Math.max(0, width - handleWidth));

  let bgCanvas: HTMLCanvasElement | null = $state(null);
  let pieceCanvas: HTMLCanvasElement | null = $state(null);

  let targetX = $state(180);
  let targetY = $state(60);

  let isDragging = $state(false);
  let startDragX = 0;
  let currentX = $state(0);
  let startTime = 0;
  let trajectory: Array<{ x: number; y: number; t: number }> = [];

  type CaptchaStatus = 'idle' | 'sliding' | 'verifying' | 'success' | 'fail';
  let status = $state<CaptchaStatus>('idle');
  let isShaking = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  const resolvedText = $derived(text ?? t('captcha.dragPrompt', '向右滑动滑块完成安全验证'));
  const resolvedSuccessText = $derived(successText ?? t('captcha.success', '验证成功'));
  const resolvedFailText = $derived(failText ?? t('captcha.failed', '验证未通过，请重新尝试'));

  // 拼图轮廓路径绘制
  function createPuzzlePath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, r: number) {
    const PI = Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);

    // 顶部凸起
    ctx.lineTo(x + (size / 2 - r), y);
    ctx.arc(x + size / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI);
    ctx.lineTo(x + size, y);

    // 右侧凹入
    ctx.lineTo(x + size, y + (size / 2 - r));
    ctx.arc(x + size + r - 2, y + size / 2, r, 1.21 * PI, 2.78 * PI);
    ctx.lineTo(x + size, y + size);

    // 底部平整
    ctx.lineTo(x, y + size);

    // 左侧凸起
    ctx.lineTo(x, y + (size / 2 + r));
    ctx.arc(x + r - 2, y + size / 2, r, 0.28 * PI, 1.72 * PI, true);
    ctx.lineTo(x, y);

    ctx.closePath();
  }

  // 绘制程序化生成的高质量防伪背景
  function drawProceduralBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // 渐变底色
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgb(37, 99, 235)');
    grad.addColorStop(0.5, 'rgb(79, 70, 229)');
    grad.addColorStop(1, 'rgb(124, 58, 237)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 装饰圆点与几何网格
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 浮动噪点光斑
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const cx = (Math.sin(i * 1.5 + 1) * 0.5 + 0.5) * w;
      const cy = (Math.cos(i * 2 + 1) * 0.5 + 0.5) * h;
      const r = 20 + i * 8;
      const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      radial.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = radial;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 初始化或重置拼图
  export function reset() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    status = 'idle';
    currentX = 0;
    isDragging = false;
    isShaking = false;
    trajectory = [];

    // 计算随机目标位置
    const minX = Math.floor(width * 0.45);
    const maxX = width - puzzleSize - 20;
    targetX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

    const minY = 20;
    const maxY = height - puzzleSize - 20;
    targetY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

    renderCanvas();
  }

  function renderCanvas() {
    if (!bgCanvas || !pieceCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    const pieceCtx = pieceCanvas.getContext('2d');
    if (!bgCtx || !pieceCtx) return;

    bgCtx.clearRect(0, 0, width, height);
    pieceCtx.clearRect(0, 0, width, height);

    if (bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        bgCtx.drawImage(img, 0, 0, width, height);
        drawPuzzleShapes(bgCtx, pieceCtx);
      };
      img.onerror = () => {
        drawProceduralBackground(bgCtx, width, height);
        drawPuzzleShapes(bgCtx, pieceCtx);
      };
      img.src = bgImage;
    } else {
      drawProceduralBackground(bgCtx, width, height);
      drawPuzzleShapes(bgCtx, pieceCtx);
    }
  }

  function drawPuzzleShapes(bgCtx: CanvasRenderingContext2D, pieceCtx: CanvasRenderingContext2D) {
    // 1. 裁剪拼图块：在 pieceCanvas 对应区域截取并画出拼图图案
    pieceCtx.save();
    createPuzzlePath(pieceCtx, targetX, targetY, puzzleSize, radius);
    pieceCtx.clip();
    if (bgCanvas) {
      pieceCtx.drawImage(bgCanvas, 0, 0, width, height);
    }
    pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    pieceCtx.lineWidth = 2;
    pieceCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    pieceCtx.shadowBlur = 4;
    createPuzzlePath(pieceCtx, targetX, targetY, puzzleSize, radius);
    pieceCtx.stroke();
    pieceCtx.restore();

    // 2. 在背景画布对应位置绘制凹槽阴影
    bgCtx.save();
    createPuzzlePath(bgCtx, targetX, targetY, puzzleSize, radius);
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    bgCtx.fill();
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    bgCtx.lineWidth = 1.5;
    bgCtx.stroke();
    bgCtx.restore();
  }

  function handleStart(clientX: number) {
    if (disabled || status === 'success' || status === 'verifying') return;
    isDragging = true;
    startDragX = clientX;
    startTime = Date.now();
    status = 'sliding';
    trajectory = [{ x: currentX, y: 0, t: startTime }];

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  }

  function handleMove(clientX: number) {
    if (!isDragging) return;
    const deltaX = clientX - startDragX;
    currentX = Math.max(0, Math.min(deltaX, maxSlide));
    trajectory.push({ x: currentX, y: 0, t: Date.now() });
  }

  function handleEnd() {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);

    status = 'verifying';
    const elapsedMs = Date.now() - startTime;

    const diff = Math.abs(currentX - targetX);
    const isDistanceValid = diff <= tolerance;
    const isTimeValid = elapsedMs >= minTimeMs && elapsedMs <= maxTimeMs;
    const isHumanValid = trajectory.length >= 2;

    if (isDistanceValid && isTimeValid && isHumanValid) {
      status = 'success';
      const token = `sc_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      onsuccess?.({ token, elapsedMs });
    } else {
      status = 'fail';
      isShaking = true;
      onfail?.();
      resetTimer = setTimeout(() => {
        reset();
      }, 900);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    handleMove(e.clientX);
  }

  function handleMouseUp() {
    handleEnd();
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0 && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  }

  function handleTouchEnd() {
    handleEnd();
  }

  function onSliderMouseDown(e: MouseEvent) {
    e.preventDefault();
    handleStart(e.clientX);
  }

  function onSliderTouchStart(e: TouchEvent) {
    if (e.touches.length > 0 && e.touches[0]) {
      handleStart(e.touches[0].clientX);
    }
  }

  function handleRefreshClick() {
    if (status === 'verifying' || disabled) return;
    reset();
    onrefresh?.();
  }

  onMount(() => {
    reset();
  });

  onDestroy(() => {
    if (resetTimer) clearTimeout(resetTimer);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  });
</script>

<div
  class={cn(
    'relative select-none rounded-xl border border-border bg-card p-3 shadow-md transition-all',
    isShaking && 'animate-shake',
    className
  )}
  style="width: {width + 26}px;"
  data-svadmin-component="SliderCaptcha"
>
  <!-- 拼图展示区 -->
  <div
    class="relative overflow-hidden rounded-lg border border-border/80 bg-muted"
    style="width: {width}px; height: {height}px;"
  >
    <!-- 背景 Canvas -->
    <canvas
      bind:this={bgCanvas}
      {width}
      {height}
      class="block h-full w-full"
    ></canvas>

    <!-- 裁剪移动拼图 Canvas -->
    <canvas
      bind:this={pieceCanvas}
      {width}
      {height}
      class="pointer-events-none absolute top-0 left-0 transition-transform duration-75"
      style="transform: translateX({currentX - targetX}px);"
    ></canvas>

    <!-- 刷新按钮 -->
    <button
      type="button"
      class="absolute top-2 right-2 rounded-md bg-black/40 p-1.5 text-white/90 backdrop-blur-sm hover:bg-black/60 hover:text-white transition-all disabled:opacity-40"
      onclick={handleRefreshClick}
      title={t('captcha.refresh', '换一张')}
      aria-label="Refresh Captcha"
      disabled={disabled || status === 'verifying'}
      data-svadmin-action="refresh-captcha"
    >
      <RotateCw class={cn('h-3.5 w-3.5', status === 'verifying' && 'animate-spin')} />
    </button>
  </div>

  <!-- 滑动轨道 -->
  <div
    class="relative mt-3 h-10 w-full overflow-hidden rounded-lg border border-border bg-muted/60 text-xs text-muted-foreground flex items-center justify-center font-medium"
  >
    <!-- 已经滑过的进度背景 -->
    <div
      class={cn(
        'absolute top-0 bottom-0 left-0 transition-colors',
        status === 'success'
          ? 'bg-primary/20 border-r border-primary'
          : status === 'fail'
            ? 'bg-destructive/20 border-r border-destructive'
            : 'bg-primary/10'
      )}
      style="width: {currentX + handleWidth}px;"
    ></div>

    <!-- 轨道提示文字 -->
    <span class="pointer-events-none z-10 px-4 text-center truncate">
      {#if status === 'success'}
        <span class="text-primary font-semibold flex items-center gap-1 justify-center">
          <Check class="h-3.5 w-3.5" />
          {resolvedSuccessText}
        </span>
      {:else if status === 'fail'}
        <span class="text-destructive font-semibold flex items-center gap-1 justify-center">
          <X class="h-3.5 w-3.5" />
          {resolvedFailText}
        </span>
      {:else}
        {resolvedText}
      {/if}
    </span>

    <!-- 滑动手柄 -->
    <div
      role="slider"
      tabindex="0"
      aria-label="Slider handle"
      aria-valuemin="0"
      aria-valuemax={maxSlide}
      aria-valuenow={currentX}
      class={cn(
        'absolute top-0 bottom-0 flex items-center justify-center rounded-md border shadow-sm cursor-grab active:cursor-grabbing transition-colors z-20',
        status === 'success'
          ? 'bg-primary text-primary-foreground border-primary'
          : status === 'fail'
            ? 'bg-destructive text-destructive-foreground border-destructive'
            : 'bg-background text-foreground border-border hover:bg-muted active:scale-95',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      style="left: {currentX}px; width: {handleWidth}px;"
      onmousedown={onSliderMouseDown}
      ontouchstart={onSliderTouchStart}
      data-svadmin-action="slider-handle"
    >
      {#if status === 'success'}
        <Check class="h-4 w-4" />
      {:else if status === 'fail'}
        <X class="h-4 w-4" />
      {:else}
        <ChevronsRight class="h-4 w-4" />
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  .animate-shake {
    animation: shake 0.4s ease-in-out;
  }
</style>
