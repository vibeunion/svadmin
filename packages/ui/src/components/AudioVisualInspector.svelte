<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    VolumeX,
    CheckCircle2,
    FileAudio,
    FileVideo,
    Tag
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type InspectionViolationLevel = 'minor' | 'major' | 'critical';
  export type InspectionOverallResult = 'passed' | 'rework' | 'failed';

  export interface ViolationMarker {
    id: string;
    timestampSeconds: number;
    title: string;
    level: InspectionViolationLevel;
    deduction: number;
    description?: string;
  }

  export interface AudioVisualMediaMeta {
    title: string;
    mediaType: 'audio' | 'video';
    durationSeconds: number;
    fileSizeMb?: number;
    format?: string;
    sampleRateOrResolution?: string;
    operatorName?: string;
    channel?: string;
  }

  export interface AudioVisualInspectorProps {
    /** 音视频媒体元数据 */
    media: AudioVisualMediaMeta;
    /** 模拟或真实的波形幅度数据（0~100 的数值数组，若未提供则自动生成模拟波形） */
    waveformData?: number[];
    /** 违规标记点列表 */
    violations?: ViolationMarker[];
    /** 初始满分值，默认 100 */
    maxScore?: number;
    /** 当前播放进度秒数（受控） */
    currentTime?: number;
    isPlaying?: boolean;
    isMuted?: boolean;
    playbackRate?: number;
    onPlayChange?: (playing: boolean) => void;
    onMuteChange?: (muted: boolean) => void;
    onPlaybackRateChange?: (rate: number) => void;
    /** 是否只读模式（不可修改评分与批注） */
    readonly?: boolean;
    /** 综合判定结果变更回调 */
    onResultChange?: (result: InspectionOverallResult, score: number) => void;
    /** 标记点击或跳转时间回调 */
    onSeek?: (timestampSeconds: number) => void;
    /** 添加违规标记回调 */
    onAddViolation?: (timestampSeconds: number, title: string, level: InspectionViolationLevel) => void;
    /** 自定义操作栏插槽 */
    actions?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    media,
    waveformData,
    violations = [],
    maxScore = 100,
    currentTime = $bindable(0),
    isPlaying = false,
    isMuted = false,
    playbackRate = 1,
    onPlayChange,
    onMuteChange,
    onPlaybackRateChange,
    readonly = false,
    onResultChange,
    onSeek,
    onAddViolation,
    actions,
    class: className = ''
  }: AudioVisualInspectorProps = $props();

  let selectedMarkerId = $state<string | null>(null);
  let newMarkerTitle = $state('');
  let newMarkerLevel = $state<InspectionViolationLevel>('minor');

  // 生成默认平滑波形数据（若未传入）
  const computedWaveform = $derived.by(() => {
    if (waveformData && waveformData.length > 0) return waveformData;
    const points: number[] = [];
    const count = 64;
    for (let i = 0; i < count; i++) {
      const base = Math.sin(i * 0.25) * 35 + 50;
      const noise = (i % 5) * 6 - 15;
      points.push(Math.max(10, Math.min(95, Math.round(base + noise))));
    }
    return points;
  });

  // 计算总扣分与综合得分
  const scoring = $derived.by(() => {
    const totalDeduction = violations.reduce((sum, v) => sum + v.deduction, 0);
    const finalScore = Math.max(0, maxScore - totalDeduction);
    let result: InspectionOverallResult = 'passed';
    if (finalScore < 60) {
      result = 'failed';
    } else if (finalScore < 85) {
      result = 'rework';
    }
    return { totalDeduction, finalScore, result };
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // 通知宿主综合判定与得分变更
  $effect(() => {
    onResultChange?.(scoring.result, scoring.finalScore);
  });

  function handleSeekTo(seconds: number) {
    currentTime = Math.max(0, Math.min(media.durationSeconds, seconds));
    onSeek?.(currentTime);
  }

  function handleTogglePlay() {
    onPlayChange?.(!isPlaying);
  }

  function handleAddMarker() {
    if (!newMarkerTitle.trim() || readonly) return;
    onAddViolation?.(currentTime, newMarkerTitle.trim(), newMarkerLevel);
    newMarkerTitle = '';
  }

  function getLevelConfig(level: InspectionViolationLevel) {
    switch (level) {
      case 'critical':
        return { label: '合规红线 / 严重', class: 'bg-destructive/15 text-destructive border-destructive/30 dark:text-destructive' };
      case 'major':
        return { label: '业务违规 / 中度', class: 'bg-warning/15 text-warning border-warning/30 dark:text-warning' };
      default:
        return { label: '话术瑕疵 / 轻微', class: 'bg-info/15 text-info border-info/30 dark:text-info' };
    }
  }

  function getResultConfig(result: InspectionOverallResult) {
    switch (result) {
      case 'passed':
        return { label: '质检合格', class: 'bg-success/15 text-success border-success/30 dark:text-success' };
      case 'rework':
        return { label: '待复核整改', class: 'bg-warning/15 text-warning border-warning/30 dark:text-warning' };
      default:
        return { label: '质检不合格', class: 'bg-destructive/15 text-destructive border-destructive/30 dark:text-destructive' };
    }
  }

  const resultBadge = $derived(getResultConfig(scoring.result));
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden',
    className
  )}
  data-svadmin-component="AudioVisualInspector"
>
  <!-- 头部：媒体信息与质检总分胶囊 -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
    <div class="flex items-center gap-3.5">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {#if media.mediaType === 'video'}
          <FileVideo class="h-5 w-5" />
        {:else}
          <FileAudio class="h-5 w-5" />
        {/if}
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-foreground">{media.title}</h3>
          <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground uppercase font-mono">
            {media.format || (media.mediaType === 'video' ? 'MP4' : 'WAV')}
          </span>
          {#if media.operatorName}
            <span class="text-xs text-muted-foreground">坐席：{media.operatorName}</span>
          {/if}
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>总时长：{formatTime(media.durationSeconds)}</span>
          {#if media.fileSizeMb}
            <span>大小：{media.fileSizeMb} MB</span>
          {/if}
          {#if media.sampleRateOrResolution}
            <span>规格：{media.sampleRateOrResolution}</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- 质检得分与判定状态 -->
    <div class="flex items-center gap-3">
      <div class="flex flex-col items-end">
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">质检综合评分</span>
          <span class="text-lg font-black tracking-tight text-foreground font-mono">
            {scoring.finalScore}
            <span class="text-xs font-normal text-muted-foreground">/ {maxScore}</span>
          </span>
        </div>
        <span class={cn('rounded border px-2 py-0.2 text-[10px] font-semibold', resultBadge.class)}>
          {resultBadge.label}
        </span>
      </div>

      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </header>

  <!-- 波形图可视化与播放控制轴 -->
  <div class="flex flex-col gap-2.5 border-b border-border bg-card p-5">
    <!-- 纯 SVG 交互式波形谱图 -->
    <div class="relative flex h-24 w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
      <!-- 播放头指示竖线 -->
      <div
        class="absolute top-0 bottom-0 z-10 w-0.5 bg-primary pointer-events-none transition-all duration-75"
        style="left: {(currentTime / Math.max(1, media.durationSeconds)) * 100}%;"
      >
        <div class="absolute -top-1 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary shadow-xs"></div>
      </div>

      <!-- 违规标记点在波形上的落点图钉 -->
      {#each violations as v (v.id)}
        {@const posPercent = (v.timestampSeconds / Math.max(1, media.durationSeconds)) * 100}
        <button
          type="button"
          class={cn(
            'absolute -bottom-1 z-20 -translate-x-1/2 flex items-center justify-center rounded-full transition-transform hover:scale-125',
            v.level === 'critical' ? 'bg-destructive text-white h-4 w-4 text-[10px]' : 'bg-warning text-white h-3.5 w-3.5 text-[9px]'
          )}
          style="left: {posPercent}%;"
          onclick={() => handleSeekTo(v.timestampSeconds)}
          title="{v.title} ({formatTime(v.timestampSeconds)}) - 扣 {v.deduction} 分"
        >
          !
        </button>
      {/each}

      <!-- 波形采样条柱 -->
      <div class="flex h-full w-full items-center justify-between gap-0.5">
        {#each computedWaveform as val, idx (idx)}
          {@const barTime = (idx / computedWaveform.length) * media.durationSeconds}
          {@const isPassed = barTime <= currentTime}
          <div
            class="group relative flex h-full flex-1 cursor-pointer items-center justify-center"
            onclick={() => handleSeekTo(barTime)}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter') handleSeekTo(barTime);
            }}
          >
            <div
              class={cn(
                'w-full max-w-[5px] rounded-full transition-colors',
                isPassed ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-primary/50'
              )}
              style="height: {val}%;"
            ></div>
          </div>
        {/each}
      </div>
    </div>

    <!-- 播放器工具栏 -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          onclick={handleTogglePlay}
          disabled={!onPlayChange}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {#if isPlaying}
            <Pause class="h-4 w-4" />
          {:else}
            <Play class="h-4 w-4 ml-0.5" />
          {/if}
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onclick={() => handleSeekTo(0)}
          title="重置到片头"
        >
          <RotateCcw class="h-3.5 w-3.5" />
        </button>

        <!-- 播放进度时间指示 -->
        <span class="font-mono text-foreground font-semibold">
          {formatTime(currentTime)} <span class="text-muted-foreground font-normal">/ {formatTime(media.durationSeconds)}</span>
        </span>
      </div>

      <!-- 倍速与静音 -->
      <div class="flex items-center gap-2">
        <!-- 倍速切换 -->
        <div class="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-[11px] font-mono">
          {#each [1.0, 1.25, 1.5, 2.0] as rate (rate)}
            <button
              type="button"
              class={cn(
                'rounded px-1.5 py-0.5 transition-colors',
                playbackRate === rate ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              disabled={!onPlaybackRateChange}
              onclick={() => onPlaybackRateChange?.(rate)}
              aria-pressed={playbackRate === rate}
            >
              {rate}x
            </button>
          {/each}
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted"
          disabled={!onMuteChange}
          onclick={() => onMuteChange?.(!isMuted)}
          aria-label={isMuted ? '取消静音' : '静音'}
        >
          {#if isMuted}
            <VolumeX class="h-3.5 w-3.5 text-destructive" />
          {:else}
            <Volume2 class="h-3.5 w-3.5" />
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- 下部双分栏：左侧违规扣分标记清单 + 右侧快速添加标记 -->
  <div class="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0 text-xs">
    <!-- 违规标记列表 (7 列) -->
    <div class="flex flex-col gap-2 p-4 lg:col-span-7">
      <div class="flex items-center justify-between">
        <span class="font-semibold text-foreground">质检违规扣分点 ({violations.length})</span>
        <span class="text-destructive dark:text-destructive font-mono">累计扣分：-{scoring.totalDeduction} 分</span>
      </div>

      <div class="flex flex-col gap-1.5 pt-1">
        {#each violations as v (v.id)}
          {@const levelBadge = getLevelConfig(v.level)}
          <button
            type="button"
            class={cn(
              'flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-colors cursor-pointer',
              selectedMarkerId === v.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-muted/40'
            )}
            data-violation-id={v.id}
            onclick={() => {
              selectedMarkerId = v.id;
              handleSeekTo(v.timestampSeconds);
            }}
          >
            <div class="flex items-center gap-2.5">
              <span class="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                {formatTime(v.timestampSeconds)}
              </span>
              <div class="flex flex-col">
                <span class="font-medium text-foreground">{v.title}</span>
                {#if v.description}
                  <span class="text-[11px] text-muted-foreground">{v.description}</span>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class={cn('rounded border px-1.5 py-0.2 text-[10px] font-medium', levelBadge.class)}>
                {levelBadge.label}
              </span>
              <span class="font-mono font-semibold text-destructive dark:text-destructive">
                -{v.deduction}分
              </span>
            </div>
          </button>
        {/each}

        {#if violations.length === 0}
          <div class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CheckCircle2 class="h-6 w-6 text-success mb-1" />
            <span>未发现违规扣分项，质检表现良好</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- 右侧：添加质检违规标记 (5 列) -->
    <div class="flex flex-col gap-3 p-4 bg-muted/10 lg:col-span-5">
      <div class="font-semibold text-foreground">快速打标时间点</div>
      <p class="text-muted-foreground text-[11px]">
        定位当前播放进度 <code class="font-mono font-semibold text-foreground">{formatTime(currentTime)}</code>，为音视频添加合规扣分标记。
      </p>

      {#if !readonly}
        <div class="flex flex-col gap-2 pt-1">
          <input
            type="text"
            class="h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="违规事项（如：违规承诺收益率）..."
            bind:value={newMarkerTitle}
            onkeydown={(e) => {
              if (e.key === 'Enter') handleAddMarker();
            }}
          />

          <div class="flex items-center justify-between gap-2">
            <select
              class="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              bind:value={newMarkerLevel}
            >
              <option value="minor">轻微瑕疵 (-5 分)</option>
              <option value="major">业务违规 (-15 分)</option>
              <option value="critical">合规红线 (-30 分)</option>
            </select>

            <button
              type="button"
              class="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onclick={handleAddMarker}
            >
              <Tag class="h-3 w-3" />
              打标
            </button>
          </div>
        </div>
      {:else}
        <div class="rounded-md border border-border bg-card p-3 text-center text-muted-foreground">
          只读质检查看态，不可编辑扣分记录
        </div>
      {/if}
    </div>
  </div>
</div>
