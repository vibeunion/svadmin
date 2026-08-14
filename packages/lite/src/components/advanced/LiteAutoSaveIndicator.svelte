<script lang="ts">
  /**
   * SSR AutoSaveIndicator — Degraded to a static status label.
   * Without JS, there is no auto-save. This component simply renders
   * the last known save status passed from the server.
   */
  interface Props {
    status?: 'idle' | 'saved' | 'error';
    message?: string;
  }

  let { status = 'idle', message }: Props = $props();

  const statusConfig: Record<string, { icon: string; color: string; text: string }> = {
    idle: { icon: '☁', color: '#64748b', text: 'All changes saved' },
    saved: { icon: '✓', color: '#10b981', text: 'Saved' },
    error: { icon: '✕', color: '#ef4444', text: 'Save failed' },
  };

  const cfg = $derived(statusConfig[status] ?? statusConfig.idle);
</script>

<span class="lite-inline-sm" style="display: inline-flex; align-items: center; font-size: 13px; color: {cfg.color};">
  <span>{cfg.icon}</span>
  <span>{message ?? cfg.text}</span>
</span>
