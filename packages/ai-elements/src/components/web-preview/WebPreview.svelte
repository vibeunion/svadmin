<script module lang="ts">
  export type WebPreviewDevice = 'desktop' | 'tablet' | 'mobile';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ExternalLink, Globe, Monitor, RefreshCw, Smartphone, Tablet } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    url?: string;
    defaultUrl?: string;
    srcdoc?: string;
    title?: string;
    device?: WebPreviewDevice;
    open?: boolean;
    editable?: boolean;
    sandbox?: string;
    class?: string;
    children?: Snippet;
    onurlchange?: (url: string) => void;
    onUrlChange?: (url: string) => void;
    onload?: () => void;
  }

  let {
    defaultUrl = '',
    url = $bindable(defaultUrl),
    srcdoc,
    title = 'Web preview',
    device = $bindable<WebPreviewDevice>('desktop'),
    open = $bindable(true),
    editable = true,
    sandbox = 'allow-scripts',
    class: className = '',
    children,
    onurlchange,
    onUrlChange,
    onload,
  }: Props = $props();

  import { provideWebPreviewContext, sanitizePreviewUrl } from './context.svelte.js';

  const previewId = $props.id();
  let draftUrl = $state(url);
  let revision = $state(0);
  let loading = $state(false);
  let consoleOpen = $state(false);
  let history = $state<string[]>(url ? [url] : []);
  let historyIndex = $state(url ? 0 : -1);
  const safeUrl = $derived(sanitizePreviewUrl(url));
  const invalidUrl = $derived(Boolean(url.trim()) && !safeUrl && !srcdoc);

  $effect(() => {
    draftUrl = url;
    if (url && history[historyIndex] !== url) {
      history = [...history.slice(0, historyIndex + 1), url];
      historyIndex = history.length - 1;
    }
  });
  $effect(() => { if (safeUrl || srcdoc) loading = true; });

  function navigateTo(nextUrl: string): boolean {
    const next = nextUrl.trim();
    if (next && !sanitizePreviewUrl(next)) return false;
    url = next;
    loading = Boolean(next || srcdoc);
    onurlchange?.(next);
    onUrlChange?.(next);
    return true;
  }

  function navigate() {
    navigateTo(draftUrl);
  }

  function reload() {
    loading = Boolean(safeUrl || srcdoc);
    revision += 1;
  }

  function back(): void { if (historyIndex <= 0) return; historyIndex -= 1; url = history[historyIndex] ?? ''; loading = Boolean(url || srcdoc); onurlchange?.(url); onUrlChange?.(url); }
  function forward(): void { if (historyIndex >= history.length - 1) return; historyIndex += 1; url = history[historyIndex] ?? ''; loading = Boolean(url || srcdoc); onurlchange?.(url); onUrlChange?.(url); }

  function handleLoad() {
    loading = false;
    onload?.();
  }

  provideWebPreviewContext({
    get url() { return url; },
    get safeUrl() { return safeUrl; },
    get srcdoc() { return srcdoc; },
    get sandbox() { return sandbox; },
    get title() { return title; },
    get loading() { return loading; },
    get revision() { return revision; },
    get consoleOpen() { return consoleOpen; },
    get canGoBack() { return historyIndex > 0; },
    get canGoForward() { return historyIndex < history.length - 1; },
    navigate: navigateTo,
    back,
    forward,
    reload,
    setConsoleOpen(nextOpen) { consoleOpen = nextOpen; },
    frameLoaded: handleLoad,
  });
</script>

<section class={cn('svadmin-ai-web-preview', children && 'svadmin-ai-web-preview--compound', className)} aria-labelledby={children ? undefined : `${previewId}-title`} data-slot="web-preview">
  {#if children}
    {@render children()}
  {:else}
  <header class="svadmin-ai-web-preview__toolbar">
    <div class="svadmin-ai-web-preview__identity"><span aria-hidden="true"><Globe size={16} /></span><h3 id={`${previewId}-title`}>{title}</h3></div>
    <div class="svadmin-ai-web-preview__devices" aria-label="Preview viewport">
      <button type="button" aria-label="Desktop viewport" title="Desktop viewport" aria-pressed={device === 'desktop'} onclick={() => { device = 'desktop'; }}><Monitor size={15} aria-hidden="true" /></button>
      <button type="button" aria-label="Tablet viewport" title="Tablet viewport" aria-pressed={device === 'tablet'} onclick={() => { device = 'tablet'; }}><Tablet size={15} aria-hidden="true" /></button>
      <button type="button" aria-label="Mobile viewport" title="Mobile viewport" aria-pressed={device === 'mobile'} onclick={() => { device = 'mobile'; }}><Smartphone size={15} aria-hidden="true" /></button>
    </div>
    <div class="svadmin-ai-web-preview__actions">
      <button type="button" aria-label="Reload preview" title="Reload preview" onclick={reload}><RefreshCw size={15} aria-hidden="true" /></button>
      {#if safeUrl}<a href={safeUrl} target="_blank" rel="external noreferrer" aria-label="Open preview in new tab" title="Open preview in new tab"><ExternalLink size={15} aria-hidden="true" /></a>{/if}
      <button class="svadmin-ai-web-preview__text-button" type="button" aria-expanded={open} aria-controls={`${previewId}-frame`} onclick={() => { open = !open; }}>{open ? 'Hide' : 'Show'}</button>
    </div>
  </header>

  {#if editable}
    <form class="svadmin-ai-web-preview__address" onsubmit={(event) => { event.preventDefault(); navigate(); }}>
      <label class="svadmin-ai-web-preview__sr-only" for={`${previewId}-url`}>Preview URL</label>
      <input id={`${previewId}-url`} type="text" inputmode="url" bind:value={draftUrl} placeholder="https://example.com" aria-invalid={invalidUrl} />
      <button type="submit">Go</button>
    </form>
  {/if}

  {#if invalidUrl}<p class="svadmin-ai-web-preview__error" role="alert">Enter an HTTP, HTTPS, blob, about, or relative URL.</p>{/if}

  {#if open}
    <div id={`${previewId}-frame`} class="svadmin-ai-web-preview__stage" data-device={device}>
      {#if loading}<div class="svadmin-ai-web-preview__loading" role="status">Loading preview...</div>{/if}
      {#if safeUrl || srcdoc}
        {#key revision}
          <iframe title={title} src={safeUrl || undefined} {srcdoc} {sandbox} onload={handleLoad}></iframe>
        {/key}
      {:else}
        <p class="svadmin-ai-web-preview__empty">Enter a URL to start the preview.</p>
      {/if}
    </div>
  {/if}
  {/if}
</section>

<style>
  .svadmin-ai-web-preview { display: grid; overflow: hidden; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-web-preview__toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: .65rem; min-height: 3rem; padding: .55rem .7rem; border-bottom: 1px solid var(--border, currentColor); }
  .svadmin-ai-web-preview__identity { display: flex; min-width: 0; align-items: center; gap: .45rem; }
  .svadmin-ai-web-preview__identity > span { display: inline-flex; flex: none; color: var(--primary, currentColor); }
  h3 { overflow: hidden; margin: 0; font-size: .82rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-web-preview__devices, .svadmin-ai-web-preview__actions { display: flex; align-items: center; gap: .2rem; }
  .svadmin-ai-web-preview__actions { justify-self: end; }
  .svadmin-ai-web-preview__devices button, .svadmin-ai-web-preview__actions button, .svadmin-ai-web-preview__actions a { display: inline-flex; width: 1.9rem; height: 1.9rem; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); font: inherit; cursor: pointer; }
  .svadmin-ai-web-preview__devices button:hover, .svadmin-ai-web-preview__actions button:hover, .svadmin-ai-web-preview__actions a:hover, .svadmin-ai-web-preview__devices button[aria-pressed='true'] { border-color: var(--border, currentColor); background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-web-preview__toolbar button:focus-visible, .svadmin-ai-web-preview__toolbar a:focus-visible, .svadmin-ai-web-preview__address input:focus-visible, .svadmin-ai-web-preview__address button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-web-preview__actions .svadmin-ai-web-preview__text-button { width: auto; padding: 0 .45rem; font-size: .72rem; }
  .svadmin-ai-web-preview__address { display: flex; gap: .4rem; padding: .55rem .7rem; border-bottom: 1px solid var(--border, currentColor); background: var(--muted, transparent); }
  .svadmin-ai-web-preview__address input { min-width: 0; min-height: 2rem; flex: 1; padding: .35rem .55rem; border: 1px solid var(--input, var(--border, currentColor)); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, transparent); color: var(--foreground, currentColor); font: inherit; font-size: .76rem; }
  .svadmin-ai-web-preview__address button { min-width: 2.5rem; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); font: inherit; font-size: .75rem; cursor: pointer; }
  .svadmin-ai-web-preview__error { margin: 0; padding: .45rem .7rem; color: var(--destructive, currentColor); font-size: .73rem; }
  .svadmin-ai-web-preview__stage { position: relative; display: flex; min-height: 24rem; overflow: auto; justify-content: center; padding: .75rem; background: var(--muted, transparent); }
  .svadmin-ai-web-preview__stage iframe { display: block; width: 100%; min-height: 32rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, transparent); }
  .svadmin-ai-web-preview__stage[data-device='tablet'] iframe { width: min(48rem, 100%); }
  .svadmin-ai-web-preview__stage[data-device='mobile'] iframe { width: min(24rem, 100%); }
  .svadmin-ai-web-preview__loading { position: absolute; z-index: 1; top: 1rem; left: 50%; transform: translateX(-50%); padding: .3rem .55rem; border: 1px solid var(--border, currentColor); border-radius: 999px; background: var(--popover, var(--background, transparent)); color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-web-preview__empty { align-self: center; margin: 0; color: var(--muted-foreground, currentColor); font-size: .8rem; text-align: center; }
  .svadmin-ai-web-preview__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .svadmin-ai-web-preview--compound { display: flex; flex-direction: column; }
  @media (max-width: 42rem) { .svadmin-ai-web-preview__toolbar { grid-template-columns: minmax(0, 1fr) auto; } .svadmin-ai-web-preview__devices { grid-column: 1 / -1; grid-row: 2; justify-content: center; } .svadmin-ai-web-preview__actions { grid-column: 2; grid-row: 1; } }
</style>
