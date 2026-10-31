<script lang="ts">
  interface Props {
    value: number;
    max?: number;
    label?: string;
    showValue?: boolean;
    tone?: 'default' | 'success' | 'warning' | 'danger';
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { value, max = 100, label, showValue = true, tone = 'default',
    class: className = ''
  }: Props = $props();
  const safeMax = $derived(max > 0 ? max : 100);
  const safeValue = $derived(Math.max(0, Math.min(value, safeMax)));
  const percent = $derived(Math.round((safeValue / safeMax) * 100));
</script>

<div class="lite-progress {className}" data-tone={tone}>
  {#if label || showValue}
    <div class="lite-progress__meta">
      {#if label}<span>{label}</span>{/if}
      {#if showValue}<span>{percent}%</span>{/if}
    </div>
  {/if}
  <progress max={safeMax} value={safeValue}>{percent}%</progress>
</div>

<style>
  .lite-progress { display: block; }
  .lite-progress__meta { display: flex; justify-content: space-between; color: #4E5969; font-size: 12px; }
  .lite-progress progress { width: 100%; height: 8px; border: 0; border-radius: 999px; background: #F2F3F5; }
  .lite-progress progress::-webkit-progress-bar { border-radius: 999px; background: #F2F3F5; }
  .lite-progress progress::-webkit-progress-value { border-radius: 999px; background: #165DFF; }
  .lite-progress progress::-moz-progress-bar { border-radius: 999px; background: #165DFF; }
  .lite-progress[data-tone='success'] progress::-webkit-progress-value { background: #00B42A; }
  .lite-progress[data-tone='success'] progress::-moz-progress-bar { background: #00B42A; }
  .lite-progress[data-tone='warning'] progress::-webkit-progress-value { background: #FF7D00; }
  .lite-progress[data-tone='warning'] progress::-moz-progress-bar { background: #FF7D00; }
  .lite-progress[data-tone='danger'] progress::-webkit-progress-value { background: #F53F3F; }
  .lite-progress[data-tone='danger'] progress::-moz-progress-bar { background: #F53F3F; }

  .lite-progress progress { margin-top: 4px; }
  .lite-progress__meta > * + * { margin-left: 8px; }
</style>
