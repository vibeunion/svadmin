<script lang="ts">
  /**
   * SSR AutoSaveIndicator — renders the last known save state passed from the
   * server. There is no auto-save loop without JS, but the state machine itself
   * (idle / loading / success / error) is fully expressible in server HTML.
   */
  type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

  interface Props {
    status?: SaveStatus | 'saved';
    /** Error detail, exposed as the accessible title on the error label. */
    error?: string;
    /** Overrides the built-in label for the current status. */
    message?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { status = 'idle', error, message, class: className = '' }: Props = $props();

  // `saved` was the old spelling of `success`; keep it working.
  const normalized = $derived<SaveStatus>(status === 'saved' ? 'success' : status);

  const statusConfig: Record<SaveStatus, { icon: string; tone: string; text: string; label: string }> = {
    idle: { icon: '☁', tone: 'idle', text: 'All changes saved', label: 'All changes saved' },
    loading: { icon: '◌', tone: 'loading', text: 'Saving…', label: 'Saving' },
    success: { icon: '✓', tone: 'success', text: 'Saved', label: 'Saved' },
    error: { icon: '✕', tone: 'error', text: 'Save failed', label: 'Save failed' },
  };

  const cfg = $derived(statusConfig[normalized] ?? statusConfig.idle);
</script>

<span
  class={`lite-auto-save lite-auto-save--${cfg.tone} ${className}`.trim()}
  role="status"
  aria-live="polite"
  aria-label={cfg.label}
  title={normalized === 'error' ? error : undefined}
>
  <span aria-hidden="true">{cfg.icon}</span>
  <span class="lite-auto-save__text">{message ?? cfg.text}</span>
  {#if normalized === 'error' && error}
    <span class="lite-auto-save__error">{error}</span>
  {/if}
</span>

<style>
  .lite-auto-save { display: inline-flex; align-items: center; font-size: 13px; color: #4E5969; }
  .lite-auto-save > * + * { margin-left: 6px; }
  .lite-auto-save--loading { color: #165DFF; }
  .lite-auto-save--success { color: #00B42A; }
  .lite-auto-save--error { color: #F53F3F; }
  .lite-auto-save__error { color: #86909C; font-size: 12px; }
</style>