<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ChatAttachment } from '../../contracts.js';
  import type { AttachmentVariant } from './types.js';

  export type AttachmentsProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'onchange'> & {
    attachments?: ChatAttachment[];
    variant?: AttachmentVariant;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    maxSize?: number;
    label?: string;
    emptyLabel?: string;
    class?: string;
    children?: Snippet;
    onchange?: (attachments: ChatAttachment[]) => void;
    onremove?: (attachment: ChatAttachment, index: number) => void;
  };
</script>

<script lang="ts">
  import { File as FileIcon, Image as ImageIcon, Paperclip, Trash2, Upload } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';
  import { provideAttachmentsContext } from './context.svelte.js';

  let {
    attachments = $bindable<ChatAttachment[] | undefined>(),
    variant = 'grid',
    accept,
    multiple = true,
    disabled = false,
    maxSize,
    label = 'Add attachments',
    emptyLabel = 'No files attached',
    class: className = '',
    children,
    onchange,
    onremove,
    ...rest
  }: AttachmentsProps = $props();

  const componentId = $props.id();
  let inputElement = $state<HTMLInputElement | null>(null);
  let errorMessage = $state('');
  const currentAttachments = $derived(attachments ?? []);
  const compoundMode = $derived(attachments === undefined && Boolean(children));
  const objectUrls = new Map<string, string>();

  provideAttachmentsContext({ get variant() { return variant; } });

  function makeId(file: File, index: number): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${index}-${file.name}`;
  }

  function formatSize(size?: number): string {
    if (!size || size < 1024) return size ? `${size} B` : '';
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function isImage(attachment: ChatAttachment): boolean {
    return attachment.mediaType?.startsWith('image/') === true;
  }

  function chooseFiles(): void {
    if (!disabled) inputElement?.click();
  }

  function handleInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    errorMessage = '';
    if (files.length === 0) return;

    const accepted: ChatAttachment[] = [];
    for (const [index, file] of files.entries()) {
      if (maxSize !== undefined && file.size > maxSize) {
        errorMessage = `${file.name} exceeds the size limit.`;
        continue;
      }
      const id = makeId(file, index);
      const url = typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined;
      if (url) objectUrls.set(id, url);
      accepted.push({ id, name: file.name, mediaType: file.type || undefined, size: file.size, url, file });
    }

    const next = multiple ? [...currentAttachments, ...accepted] : accepted.slice(0, 1);
    attachments = next;
    onchange?.(next);
    input.value = '';
  }

  function removeAttachment(attachment: ChatAttachment, index: number): void {
    const url = objectUrls.get(attachment.id);
    if (url && typeof URL !== 'undefined') URL.revokeObjectURL(url);
    objectUrls.delete(attachment.id);
    const next = currentAttachments.filter((_, itemIndex) => itemIndex !== index);
    attachments = next;
    onremove?.(attachment, index);
    onchange?.(next);
  }

  $effect(() => () => {
    if (typeof URL !== 'undefined') for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    objectUrls.clear();
  });
</script>

{#if compoundMode}
  <div
    {...rest}
    class={cn(
      'svadmin-ai-attachments-compound',
      variant === 'list' && 'svadmin-ai-attachments-compound--list',
      variant === 'grid' && 'svadmin-ai-attachments-compound--grid',
      className,
    )}
    data-slot="attachments"
    data-variant={variant}
  >
    {@render children?.()}
  </div>
{:else}
  <section {...rest} class={cn('svadmin-ai-attachments', className)} aria-labelledby={`${componentId}-label`} data-slot="attachments-uploader">
    <div class="svadmin-ai-attachments__header">
      <h3 id={`${componentId}-label`}>{label}</h3>
      <span class="svadmin-ai-attachments__count" aria-live="polite">{currentAttachments.length}</span>
    </div>

    <input bind:this={inputElement} class="svadmin-ai-attachments__input" type="file" {accept} {multiple} {disabled} onchange={handleInput} aria-describedby={`${componentId}-help`} />
    <button class="svadmin-ai-attachments__dropzone" type="button" {disabled} onclick={chooseFiles} aria-label={label} aria-describedby={`${componentId}-help`}>
      <Upload size={17} aria-hidden="true" />
      <span>Choose files</span>
      <small id={`${componentId}-help`}>{accept ?? 'Any file type'}{#if maxSize} / Up to {formatSize(maxSize)}{/if}</small>
    </button>

    {#if errorMessage}<p class="svadmin-ai-attachments__error" role="alert">{errorMessage}</p>{/if}

    {#if currentAttachments.length > 0}
      <ul class="svadmin-ai-attachments__list">
        {#each currentAttachments as attachment, index (attachment.id)}
          {@const previewUrl = safeResourceUrl(attachment.url)}
          <li class="svadmin-ai-attachments__item">
            <span class="svadmin-ai-attachments__preview" aria-hidden="true">
              {#if isImage(attachment) && previewUrl}<img src={previewUrl} alt="" />{:else if isImage(attachment)}<ImageIcon size={16} />{:else}<FileIcon size={16} />{/if}
            </span>
            <span class="svadmin-ai-attachments__meta"><strong title={attachment.name}>{attachment.name}</strong>{#if attachment.size}<small>{formatSize(attachment.size)}</small>{/if}</span>
            <button class="svadmin-ai-attachments__remove" type="button" aria-label={`Remove ${attachment.name}`} title={`Remove ${attachment.name}`} {disabled} onclick={() => removeAttachment(attachment, index)}><Trash2 size={15} aria-hidden="true" /></button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="svadmin-ai-attachments__empty"><Paperclip size={14} aria-hidden="true" /> {emptyLabel}</p>
    {/if}

    {#if children}<div class="svadmin-ai-attachments__footer">{@render children()}</div>{/if}
  </section>
{/if}

<style>
  .svadmin-ai-attachments-compound { display: flex; flex-wrap: wrap; align-items: flex-start; gap: .5rem; color: var(--foreground, currentColor); }
  .svadmin-ai-attachments-compound--list { flex-direction: column; }
  .svadmin-ai-attachments-compound--grid { width: fit-content; margin-inline-start: auto; }
  .svadmin-ai-attachments { display: grid; gap: .75rem; color: var(--foreground, currentColor); }
  .svadmin-ai-attachments__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
  h3 { margin: 0; font-size: .85rem; font-weight: 650; }
  .svadmin-ai-attachments__count { min-width: 1.35rem; padding: .15rem .35rem; border-radius: 999px; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); font-size: .7rem; text-align: center; }
  .svadmin-ai-attachments__input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .svadmin-ai-attachments__dropzone { display: grid; justify-items: center; gap: .3rem; min-height: 5rem; padding: .8rem; border: 1px dashed var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, transparent); color: var(--muted-foreground, currentColor); font: inherit; font-size: .8rem; cursor: pointer; }
  .svadmin-ai-attachments__dropzone span { color: var(--foreground, currentColor); font-weight: 550; }
  .svadmin-ai-attachments__dropzone small { font-size: .7rem; }
  .svadmin-ai-attachments__dropzone:hover:not(:disabled) { border-color: var(--primary, currentColor); background: color-mix(in oklch, var(--primary, currentColor) 5%, transparent); }
  .svadmin-ai-attachments__dropzone:focus-visible, .svadmin-ai-attachments__remove:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-attachments__dropzone:disabled, .svadmin-ai-attachments__remove:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-attachments__error { margin: 0; color: var(--destructive, currentColor); font-size: .75rem; }
  .svadmin-ai-attachments__list { display: grid; gap: .4rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-ai-attachments__item { display: flex; min-width: 0; align-items: center; gap: .55rem; padding: .45rem .55rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); }
  .svadmin-ai-attachments__preview { display: inline-flex; width: 2rem; height: 2rem; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: min(var(--radius, .5rem), .5rem); background: var(--muted, transparent); color: var(--muted-foreground, currentColor); }
  .svadmin-ai-attachments__preview img { width: 100%; height: 100%; object-fit: cover; }
  .svadmin-ai-attachments__meta { display: grid; min-width: 0; flex: 1; gap: .1rem; }
  .svadmin-ai-attachments__meta strong { overflow: hidden; font-size: .78rem; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-attachments__meta small { color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-attachments__remove { display: inline-flex; width: 1.9rem; height: 1.9rem; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-attachments__remove:hover:not(:disabled) { color: var(--destructive, currentColor); }
  .svadmin-ai-attachments__empty { display: flex; align-items: center; justify-content: center; gap: .35rem; margin: 0; padding: .45rem; color: var(--muted-foreground, currentColor); font-size: .75rem; }
  .svadmin-ai-attachments__footer { border-top: 1px solid var(--border, currentColor); padding-top: .65rem; }
</style>
