<script lang="ts">
  /**
   * SSR Toast — Degraded to a static alert banner.
   * In SSR-only mode, toast notifications are rendered as inline banners
   * by the server and included in the page HTML. They persist until the
   * next full-page navigation (no auto-dismiss without JS).
   */
  interface Props {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    dismissUrl?: string;
  }

  let { message, type = 'info', dismissUrl }: Props = $props();

  const colors: Record<NonNullable<Props['type']>, { bg: string; border: string; text: string }> = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#fed7aa', text: '#92400e' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  };

  const style = $derived(colors[type] ?? colors['info']);
</script>

<div
  role="alert"
  style="padding: 12px 16px; background: {style.bg}; border: 1px solid {style.border}; color: {style.text}; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 14px;"
>
  <span>{message}</span>
  {#if dismissUrl}
    <a href={dismissUrl} style="color: {style.text}; text-decoration: none; font-weight: 600; margin-left: 12px;">✕</a>
  {/if}
</div>
