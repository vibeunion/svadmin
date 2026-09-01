<script module lang="ts">
  export type ArtifactKind = 'text' | 'code' | 'json' | 'html' | 'image' | 'file';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, Code2, Copy, Download, ExternalLink, FileText, Maximize2, Minimize2 } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';

  interface Props {
    title?: string;
    description?: string;
    content?: string;
    kind?: ArtifactKind;
    language?: string;
    url?: string;
    downloadName?: string;
    open?: boolean;
    class?: string;
    children?: Snippet;
    oncopy?: (content: string) => void;
    ondownload?: (content: string) => void;
  }

  let {
    title,
    description,
    content = '',
    kind = 'text',
    language,
    url,
    downloadName = 'artifact.txt',
    open = $bindable(true),
    class: className = '',
    children,
    oncopy,
    ondownload,
  }: Props = $props();

  const artifactId = $props.id();
  let copied = $state(false);
  const isCodeLike = $derived(kind === 'code' || kind === 'json');
  const safeArtifactUrl = $derived(safeResourceUrl(url));
  const safeImageUrl = $derived(kind === 'image' ? safeResourceUrl(url ?? content) : undefined);

  function copyWithTextarea(value: string): boolean {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const succeeded = document.execCommand('copy');
    area.remove();
    return succeeded;
  }

  async function copyContent() {
    if (!content) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        if (!copyWithTextarea(content)) return;
      }
    } else if (!copyWithTextarea(content)) return;
    copied = true;
    oncopy?.(content);
    setTimeout(() => { copied = false; }, 1600);
  }

  function downloadContent() {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/plain' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    ondownload?.(content);
  }
</script>

<article class={cn('svadmin-ai-artifact', className)} aria-labelledby={children ? undefined : `${artifactId}-title`} data-slot="artifact">
  {#if children}
    {@render children()}
  {:else}
  <header class="svadmin-ai-artifact__header">
    <div class="svadmin-ai-artifact__heading">
      <span class="svadmin-ai-artifact__icon" aria-hidden="true">{#if isCodeLike}<Code2 size={16} />{:else if kind === 'image'}<ExternalLink size={16} />{:else}<FileText size={16} />{/if}</span>
      <div><h3 id={`${artifactId}-title`} title={title ?? 'Artifact'}>{title ?? 'Artifact'}</h3>{#if description}<p>{description}</p>{/if}</div>
    </div>
    <div class="svadmin-ai-artifact__actions">
      {#if content && isCodeLike || content && kind === 'text'}<button class="svadmin-ai-artifact__icon-button" type="button" aria-label={copied ? 'Copied' : 'Copy artifact'} title={copied ? 'Copied' : 'Copy artifact'} onclick={copyContent}>{#if copied}<Check size={15} aria-hidden="true" />{:else}<Copy size={15} aria-hidden="true" />{/if}</button>{/if}
      {#if content && kind !== 'image'}<button class="svadmin-ai-artifact__icon-button" type="button" aria-label="Download artifact" title="Download artifact" onclick={downloadContent}><Download size={15} aria-hidden="true" /></button>{/if}
      <button class="svadmin-ai-artifact__icon-button" type="button" aria-expanded={open} aria-controls={`${artifactId}-body`} aria-label={open ? 'Collapse artifact' : 'Expand artifact'} title={open ? 'Collapse artifact' : 'Expand artifact'} onclick={() => { open = !open; }}>{#if open}<Minimize2 size={15} aria-hidden="true" />{:else}<Maximize2 size={15} aria-hidden="true" />{/if}</button>
    </div>
  </header>

  {#if open}
    <div id={`${artifactId}-body`} class="svadmin-ai-artifact__body">
      {#if kind === 'image' && safeImageUrl}
        <img class="svadmin-ai-artifact__image" src={safeImageUrl} alt={title ?? 'Artifact'} />
      {:else if kind === 'html'}
        <iframe class="svadmin-ai-artifact__html" title={title ?? 'Artifact'} srcdoc={content} sandbox=""></iframe>
      {:else if safeArtifactUrl}
        <a class="svadmin-ai-artifact__link" href={safeArtifactUrl} target="_blank" rel="external noreferrer">Open artifact <ExternalLink size={14} aria-hidden="true" /></a>
      {:else if content}
        <pre class={cn('svadmin-ai-artifact__content', isCodeLike && 'svadmin-ai-artifact__content--code')}><code>{content}</code></pre>
      {:else}
        <p class="svadmin-ai-artifact__empty">No artifact content.</p>
      {/if}
      {#if language && isCodeLike}<span class="svadmin-ai-artifact__language">{language}</span>{/if}
    </div>
  {/if}
  {/if}
</article>

<style>
  .svadmin-ai-artifact { display: grid; gap: .75rem; overflow: hidden; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-artifact__header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; padding: .8rem .9rem; }
  .svadmin-ai-artifact__heading { display: flex; min-width: 0; align-items: flex-start; gap: .5rem; }
  .svadmin-ai-artifact__icon { display: inline-flex; flex: none; color: var(--primary, currentColor); }
  h3 { margin: 0; overflow: hidden; font-size: .85rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  p { margin: .2rem 0 0; color: var(--muted-foreground, currentColor); font-size: .75rem; line-height: 1.4; }
  .svadmin-ai-artifact__actions { display: flex; flex: none; gap: .25rem; }
  .svadmin-ai-artifact__icon-button { display: inline-flex; width: 1.9rem; height: 1.9rem; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-artifact__icon-button:hover { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-artifact__icon-button:focus-visible, .svadmin-ai-artifact__link:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-artifact__body { position: relative; display: grid; gap: .5rem; border-top: 1px solid var(--border, currentColor); padding: .9rem; }
  .svadmin-ai-artifact__content { max-height: 28rem; overflow: auto; margin: 0; padding: .75rem; border-radius: min(var(--radius, .5rem), .5rem); background: var(--muted, transparent); color: var(--foreground, currentColor); font-size: .8rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
  .svadmin-ai-artifact__content--code { background: color-mix(in oklch, var(--foreground, currentColor) 92%, var(--background, transparent)); color: var(--background, Canvas); white-space: pre; }
  .svadmin-ai-artifact__content code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .svadmin-ai-artifact__image { display: block; max-width: 100%; max-height: 32rem; margin: auto; object-fit: contain; border-radius: min(var(--radius, .5rem), .5rem); }
  .svadmin-ai-artifact__html { width: 100%; min-height: 16rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, transparent); }
  .svadmin-ai-artifact__link { display: inline-flex; align-items: center; gap: .35rem; color: var(--primary, currentColor); font-size: .8rem; }
  .svadmin-ai-artifact__language { position: absolute; right: 1.1rem; bottom: 1.1rem; padding: .15rem .35rem; border-radius: .25rem; background: var(--background, transparent); color: var(--muted-foreground, currentColor); font-size: .68rem; }
  .svadmin-ai-artifact__empty { margin: 0; text-align: center; }
  @media (max-width: 36rem) { .svadmin-ai-artifact__header { flex-direction: column; } .svadmin-ai-artifact__actions { align-self: flex-end; } }
</style>
