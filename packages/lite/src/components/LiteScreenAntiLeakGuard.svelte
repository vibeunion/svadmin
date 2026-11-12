<script lang="ts">
  interface Props {
    text?: string;
    subtext?: string;
    class?: string;
  }

  let {
    text = '机密数据 · 严禁拍照',
    subtext = '保密审计中 · 泄漏追责',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-watermark-overlay {className}"
  data-svadmin-component="LiteScreenAntiLeakGuard"
  role="region"
  aria-label="Security Watermark"
>
  <div class="lite-watermark-grid">
    {#each Array(12) as _, idx (idx)}
      <div class="lite-watermark-item">
        <span class="lite-wm-text">{text}</span>
        {#if subtext}
          <span class="lite-wm-sub">{subtext}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-watermark-overlay {
    position: relative;
    padding: 16px;
    background: #f7f8fa;
    border: 1px dashed #c9cdd4;
    border-radius: 6px;
    overflow: hidden;
  }
  .lite-watermark-grid {
    display: block;
    text-align: center;
  }
  .lite-watermark-item {
    display: inline-block;
    margin: 12px 18px;
    transform: rotate(-15deg);
    color: #86909c;
    font-family: monospace;
    opacity: 0.6;
  }
  .lite-wm-text { display: block; font-size: 11px; font-weight: bold; }
  .lite-wm-sub { display: block; font-size: 9px; margin-top: 2px; }
</style>
