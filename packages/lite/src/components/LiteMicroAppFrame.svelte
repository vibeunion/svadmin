<script lang="ts">
  interface Props {
    src: string;
    title?: string;
    height?: string | number;
    sandbox?: string;
    allow?: string;
    referrerpolicy?: string;
    fallbackHref?: string;
    fallbackLabel?: string;
    class?: string;
  }

  let {
    src,
    title = 'Embedded application',
    height = '650px',
    sandbox = 'allow-scripts allow-forms allow-same-origin',
    allow,
    referrerpolicy = 'strict-origin-when-cross-origin',
    fallbackHref,
    fallbackLabel = 'Open in a new tab',
    class: className = '',
  }: Props = $props();

  const frameHeight = $derived(typeof height === 'number' ? `${height}px` : height);
</script>

<section class="lite-micro-app-frame lite-card {className}" aria-label={title}>
  <header>
    <h2>{title}</h2>
    {#if fallbackHref}<a href={fallbackHref} target="_blank" rel="noopener noreferrer">{fallbackLabel}</a>{/if}
  </header>

  <iframe
    {src}
    {title}
    {sandbox}
    {allow}
    {referrerpolicy}
    style={`height:${frameHeight};`}
    loading="lazy"
  ></iframe>
  <p class="lite-micro-app-help">Embedded messaging, theme sync and automatic height are client-side enhancements.</p>
</section>

<style>
  .lite-micro-app-frame { padding: 12px; }
  .lite-micro-app-frame header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
  .lite-micro-app-frame header a { margin-left: 12px; }
  .lite-micro-app-frame h2 { margin: 0; color: #1d2129; font-size: 15px; }
  .lite-micro-app-frame header a { color: #165dff; font-size: 12px; }
  .lite-micro-app-frame iframe { display: block; width: 100%; border: 1px solid #e5e6eb; border-radius: 4px; background: #fff; }
  .lite-micro-app-help { margin: 6px 0 0; color: #86909c; font-size: 11px; }
</style>
