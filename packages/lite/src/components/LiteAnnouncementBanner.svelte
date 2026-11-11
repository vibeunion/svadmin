<script lang="ts">
  type BannerTone = 'info' | 'warning' | 'error' | 'success';

  interface Props {
    message: string;
    tone?: BannerTone;
    countdownText?: string;
    actionText?: string;
    actionHref?: string;
    class?: string;
  }

  let {
    message,
    tone = 'warning',
    countdownText,
    actionText,
    actionHref,
    class: className = '',
  }: Props = $props();

  const iconChar = $derived.by(() => {
    switch (tone) {
      case 'info':
        return 'ℹ';
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
      default:
        return '⚠';
    }
  });
</script>

<aside
  class="lite-announcement-banner lite-banner-{tone} {className}"
  data-svadmin-component="LiteAnnouncementBanner"
  role="alert"
>
  <div class="lite-banner-body">
    <span class="lite-banner-icon" aria-hidden="true">{iconChar}</span>
    <span class="lite-banner-message">{message}</span>

    {#if countdownText}
      <span class="lite-banner-countdown">{countdownText}</span>
    {/if}

    {#if actionText}
      {#if actionHref}
        <a href={actionHref} class="lite-banner-action">{actionText}</a>
      {:else}
        <span class="lite-banner-action">{actionText}</span>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .lite-announcement-banner {
    padding: 8px 16px;
    border-bottom: 1px solid transparent;
    font-size: 13px;
    box-sizing: border-box;
  }
  .lite-banner-info { background: #e8f3ff; color: #165dff; border-color: #bedaff; }
  .lite-banner-warning { background: #fff7e8; color: #d46b08; border-color: #ffd591; }
  .lite-banner-error { background: #fff1f0; color: #cf1322; border-color: #ffa39e; }
  .lite-banner-success { background: #e8ffea; color: #00b42a; border-color: #aff0b5; }
  .lite-banner-body { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .lite-banner-icon { font-weight: 700; font-size: 14px; }
  .lite-banner-message { font-weight: 500; flex: 1; min-width: 200px; }
  .lite-banner-countdown {
    font-family: monospace;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.05);
    font-weight: 600;
  }
  .lite-banner-action {
    text-decoration: underline;
    font-weight: 600;
    color: inherit;
  }
</style>
