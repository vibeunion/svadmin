<script lang="ts">
  import type { Snippet } from 'svelte';

  type ResultStatus = 'success' | 'processing' | 'warning' | 'error' | '403' | '404' | '500';

  interface Props {
    status?: ResultStatus;
    title: string;
    description?: string;
    primaryActionHref?: string;
    primaryActionLabel?: string;
    secondaryActionHref?: string;
    secondaryActionLabel?: string;
    class?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let {
    status = 'success',
    title,
    description,
    primaryActionHref,
    primaryActionLabel = 'Back to Home',
    secondaryActionHref,
    secondaryActionLabel,
    class: className = '',
    actions,
    children,
  }: Props = $props();

  const iconSymbol = $derived.by(() => {
    switch (status) {
      case 'success':
        return '✓';
      case 'processing':
        return '⏳';
      case 'warning':
      case '403':
        return '!';
      case 'error':
      case '500':
        return '✕';
      case '404':
      default:
        return '?';
    }
  });
</script>

<div
  class="lite-result-page lite-result-{status} {className}"
  data-svadmin-component="LiteResultPage"
  role="status"
>
  <div class="lite-result-icon-wrapper" aria-hidden="true">
    <span class="lite-result-icon">{iconSymbol}</span>
  </div>

  <h2 class="lite-result-title">{title}</h2>

  {#if description}
    <p class="lite-result-description">{description}</p>
  {/if}

  {#if actions}
    <div class="lite-result-actions">{@render actions()}</div>
  {:else if primaryActionHref || secondaryActionHref}
    <div class="lite-result-actions">
      {#if primaryActionHref}
        <a href={primaryActionHref} class="lite-result-btn-primary">{primaryActionLabel}</a>
      {/if}
      {#if secondaryActionHref && secondaryActionLabel}
        <a href={secondaryActionHref} class="lite-result-btn-secondary">{secondaryActionLabel}</a>
      {/if}
    </div>
  {/if}

  {#if children}
    <div class="lite-result-extra">{@render children()}</div>
  {/if}
</div>

<style>
  .lite-result-page {
    text-align: center;
    padding: 48px 24px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e5e6eb;
    box-sizing: border-box;
  }
  .lite-result-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin-bottom: 16px;
    font-size: 28px;
    font-weight: 700;
  }
  .lite-result-success .lite-result-icon-wrapper { background: #e8ffea; color: #00b42a; }
  .lite-result-processing .lite-result-icon-wrapper { background: #e8f3ff; color: #165dff; }
  .lite-result-warning .lite-result-icon-wrapper { background: #fff7e8; color: #ff7d00; }
  .lite-result-error .lite-result-icon-wrapper { background: #ffece8; color: #f53f3f; }
  .lite-result-403 .lite-result-icon-wrapper { background: #fff7e8; color: #ff7d00; }
  .lite-result-404 .lite-result-icon-wrapper { background: #f2f3f5; color: #86909c; }
  .lite-result-500 .lite-result-icon-wrapper { background: #ffece8; color: #f53f3f; }
  .lite-result-title { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1d2129; }
  .lite-result-description { margin: 0 0 24px; font-size: 14px; color: #4e5969; max-width: 480px; margin-left: auto; margin-right: auto; }
  .lite-result-actions { display: flex; justify-content: center; gap: 12px; }
  .lite-result-btn-primary {
    display: inline-block;
    padding: 8px 18px;
    background: #165dff;
    color: #ffffff;
    border-radius: 4px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
  }
  .lite-result-btn-secondary {
    display: inline-block;
    padding: 8px 18px;
    background: #f2f3f5;
    color: #4e5969;
    border-radius: 4px;
    text-decoration: none;
    font-size: 13px;
  }
  .lite-result-extra { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f2f3f5; }
</style>
