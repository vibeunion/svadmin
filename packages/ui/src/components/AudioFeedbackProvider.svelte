<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { Volume2, VolumeX, BellRing, Check, AlertCircle, ScanBarcode } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { useAudioAlert, type AudioAlertType } from './useAudioAlert.svelte.js';

  export interface AudioFeedbackProviderProps {
    defaultMuted?: boolean | undefined;
    defaultVolume?: number | undefined;
    showControls?: boolean | undefined;
    class?: string | undefined;
    children?: Snippet | undefined;
  }

  let {
    defaultMuted = false,
    defaultVolume = 0.7,
    showControls = false,
    class: className = '',
    children,
  }: AudioFeedbackProviderProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  const audio = useAudioAlert({
    muted: untrack(() => defaultMuted),
    volume: untrack(() => defaultVolume),
  });

  function toggleMute() {
    audio.setMuted(!audio.isMuted);
  }

  function testSound(type: AudioAlertType) {
    audio.play(type);
  }
</script>

<div
  data-svadmin-component="AudioFeedbackProvider"
  data-muted={audio.isMuted ? 'true' : 'false'}
  class={cn('relative w-full', className)}
>
  {#if children}
    {@render children()}
  {/if}

  {#if showControls}
    <div
      class="inline-flex items-center gap-2 rounded-md border border-border bg-card/95 p-2 shadow-md backdrop-blur-sm text-xs text-foreground"
      role="region"
      aria-label="Audio Feedback Controls"
    >
      <!-- Mute Toggle -->
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-muted-foreground hover:text-foreground"
        onclick={toggleMute}
        aria-label={audio.isMuted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {#if audio.isMuted}
          <VolumeX class="h-4 w-4 text-destructive" />
        {:else}
          <Volume2 class="h-4 w-4 text-primary" />
        {/if}
      </Button>

      <!-- Volume Slider -->
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={audio.volume}
        oninput={(e) => audio.setVolume(Number((e.target as HTMLInputElement).value))}
        class="h-1.5 w-16 cursor-pointer accent-primary"
        aria-label="Sound volume"
      />

      <div class="h-3 w-px bg-border"></div>

      <!-- Quick Sound Test Triggers -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          onclick={() => testSound('success')}
          class="rounded p-1 text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
          title={chinese ? '试听成功音效' : 'Play success chime'}
          aria-label="Test success sound"
        >
          <Check class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onclick={() => testSound('error')}
          class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title={chinese ? '试听错误音效' : 'Play error buzz'}
          aria-label="Test error sound"
        >
          <AlertCircle class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onclick={() => testSound('beep')}
          class="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title={chinese ? '试听扫码嘀声' : 'Play scanner beep'}
          aria-label="Test scanner beep"
        >
          <ScanBarcode class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onclick={() => testSound('notify')}
          class="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={chinese ? '试听通知声' : 'Play notification'}
          aria-label="Test notification sound"
        >
          <BellRing class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  {/if}
</div>
