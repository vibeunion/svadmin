<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLFormAttributes } from 'svelte/elements';
  import type { ChatAttachment, ChatSource } from '../../contracts.js';

  export interface PromptInputMessage {
    text: string;
    files: ChatAttachment[];
    sources?: ChatSource[];
  }

  export interface PromptInputSubmitDetail extends PromptInputMessage {
    value: string;
    attachments: ChatAttachment[];
    event: SubmitEvent;
  }

  export interface PromptInputProps extends Omit<HTMLFormAttributes, 'children' | 'class' | 'onerror' | 'onsubmit'> {
    value?: string;
    attachments?: ChatAttachment[];
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    loading?: boolean;
    status?: 'submitted' | 'streaming' | 'error' | 'ready';
    maxLength?: number;
    maxFiles?: number;
    maxFileSize?: number;
    globalDrop?: boolean;
    syncHiddenInput?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    class?: string;
    children?: Snippet;
    onsubmit?: (detail: PromptInputSubmitDetail) => void | Promise<void>;
    onSubmit?: (message: PromptInputMessage, event: SubmitEvent) => void | Promise<void>;
    onstop?: () => void;
    onvaluechange?: (value: string) => void;
    onattachmentadd?: (files: ChatAttachment[]) => void;
    onattachmentremove?: (file: ChatAttachment, index: number) => void;
    onerror?: (error: { code: 'accept' | 'max_files' | 'max_file_size' | 'submit'; message: string }) => void;
  }
</script>

<script lang="ts">
  import { Paperclip, Send, Square, X } from '@lucide/svelte';
  import { onDestroy } from 'svelte';
  import { cn } from '../../utils.js';
  import {
    getOptionalPromptInputController,
    providePromptInputController,
    providePromptInputReferences,
    type PromptInputFile,
    type PromptInputReferencedSourcesContext,
  } from './context.svelte.js';
  import {
    createPromptInputFiles,
    revokePromptInputFile,
    toChatAttachment,
    toSubmittedAttachment,
  } from './files.js';

  let {
    value = $bindable(''),
    attachments = $bindable<ChatAttachment[]>([]),
    accept,
    multiple = true,
    disabled = false,
    loading = false,
    status,
    maxLength,
    maxFiles,
    maxFileSize,
    globalDrop = false,
    syncHiddenInput = false,
    placeholder = 'What would you like to know?',
    ariaLabel = 'Prompt input',
    'aria-label': formAriaLabel,
    class: className = '',
    children,
    onsubmit,
    onSubmit,
    onstop,
    onvaluechange,
    onattachmentadd,
    onattachmentremove,
    onerror,
    ...rest
  }: PromptInputProps = $props();

  const parentController = getOptionalPromptInputController();
  const componentId = $props.id();
  let inputElement = $state<HTMLInputElement | null>(null);
  let localFiles = $state<PromptInputFile[]>(attachments.map((item) => ({ ...item, filename: item.name })));
  let referencedSources = $state<Array<ChatSource & { id: string }>>([]);
  let composition = $state(false);
  let errorMessage = $state('');
  let submitting = $state(false);
  let textRevision = 0;
  const usingProvider = Boolean(parentController);

  const activeText = $derived(parentController?.textInput.value ?? value);
  const activeFiles = $derived(parentController?.attachments.files ?? localFiles);
  const busy = $derived(loading || submitting || status === 'submitted' || status === 'streaming');
  const canSubmit = $derived(!disabled && !busy && (activeText.trim().length > 0 || activeFiles.length > 0));

  function matchesAccept(file: File): boolean {
    if (!accept?.trim()) return true;
    const fileName = file.name.toLowerCase();
    const mediaType = file.type.toLowerCase();
    return accept.split(',').map((part) => part.trim()).filter(Boolean).some((pattern) => {
      const normalized = pattern.toLowerCase();
      if (normalized.startsWith('.')) return fileName.endsWith(normalized);
      if (normalized.endsWith('/*')) return mediaType.startsWith(normalized.slice(0, -1));
      return mediaType === normalized;
    });
  }

  function reportError(code: 'accept' | 'max_files' | 'max_file_size' | 'submit', message: string): void {
    errorMessage = message;
    onerror?.({ code, message });
  }

  function submissionErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    return 'Unable to send the message.';
  }

  function resetFileInput(): void {
    if (inputElement) inputElement.value = '';
  }

  function addFiles(incoming: File[] | FileList): PromptInputFile[] {
    const files = Array.from(incoming);
    if (files.length === 0) return [];
    const accepted = files.filter(matchesAccept);
    if (accepted.length === 0) {
      reportError('accept', 'No files match the accepted types.');
      resetFileInput();
      return [];
    }
    const sized = maxFileSize === undefined ? accepted : accepted.filter((file) => file.size <= maxFileSize);
    if (sized.length === 0) {
      reportError('max_file_size', 'All files exceed the maximum size.');
      resetFileInput();
      return [];
    }
    const retainedCount = multiple ? activeFiles.length : 0;
    const capacity = multiple
      ? (maxFiles === undefined ? sized.length : Math.max(0, maxFiles - retainedCount))
      : (maxFiles === 0 ? 0 : 1);
    if (sized.length > capacity) reportError('max_files', 'Too many files. Some were not added.');
    const selected = sized.slice(0, capacity);
    if (selected.length === 0) {
      resetFileInput();
      return [];
    }
    errorMessage = '';
    if (usingProvider) {
      if (!multiple) parentController?.attachments.clear();
      const added = parentController?.attachments.add(selected) ?? [];
      onattachmentadd?.(added.map(toChatAttachment));
      resetFileInput();
      return added;
    }
    const next = createPromptInputFiles(selected, multiple ? activeFiles : []);
    if (!multiple) for (const file of localFiles) revokePromptInputFile(file);
    localFiles = multiple ? [...localFiles, ...next] : next;
    attachments = localFiles.map(toChatAttachment);
    onattachmentadd?.(next.map(toChatAttachment));
    resetFileInput();
    return next;
  }

  function removeFile(id: string, index: number): void {
    const removed = activeFiles.find((item) => item.id === id);
    if (usingProvider) parentController?.attachments.remove(id);
    else {
      if (removed) revokePromptInputFile(removed);
      localFiles = localFiles.filter((item) => item.id !== id);
      attachments = localFiles.map(toChatAttachment);
    }
    if (removed) onattachmentremove?.(toChatAttachment(removed), index);
  }

  function openFileDialog(): void {
    if (disabled) return;
    if (inputElement) {
      inputElement.value = '';
      inputElement.click();
    } else parentController?.attachments.openFileDialog();
  }

  function setValue(next: string): void {
    textRevision += 1;
    if (parentController) parentController.textInput.setInput(next);
    else value = next;
    onvaluechange?.(next);
  }

  function clearFiles(): void {
    if (parentController) {
      parentController.attachments.clear();
      return;
    }
    for (const file of localFiles) revokePromptInputFile(file);
    localFiles = [];
    attachments = [];
  }

  function clearSubmittedFiles(submittedFiles: readonly PromptInputFile[]): void {
    const submitted = new Set(submittedFiles);
    if (parentController) {
      for (const file of [...activeFiles]) {
        if (submitted.has(file)) parentController.attachments.remove(file.id);
      }
      return;
    }

    const retained: PromptInputFile[] = [];
    for (const file of localFiles) {
      if (submitted.has(file)) revokePromptInputFile(file);
      else retained.push(file);
    }
    if (retained.length === localFiles.length) return;
    localFiles = retained;
    attachments = retained.map(toChatAttachment);
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    submitting = true;
    errorMessage = '';
    const submittedText = activeText;
    const submittedTextRevision = textRevision;
    const submittedFiles = [...activeFiles];
    const submittedSources = [...referencedSources];
    const message: PromptInputMessage = {
      text: submittedText.trim(),
      files: submittedFiles.map(toSubmittedAttachment),
      sources: submittedSources,
    };
    let callback: void | Promise<void>;
    try {
      callback = onSubmit
        ? onSubmit(message, event)
        : onsubmit?.({ ...message, value: message.text, attachments: message.files, event });
    } catch (error) {
      reportError('submit', submissionErrorMessage(error));
      submitting = false;
      return;
    }

    void Promise.resolve(callback).then(() => {
      if (textRevision === submittedTextRevision && activeText === submittedText) {
        if (parentController) parentController.textInput.clear();
        else value = '';
      }
      clearSubmittedFiles(submittedFiles);
      const submittedSourceSet = new Set(submittedSources);
      referencedSources = referencedSources.filter((source) => !submittedSourceSet.has(source));
    }, (error: unknown) => {
      reportError('submit', submissionErrorMessage(error));
    }).finally(() => {
      submitting = false;
    });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !composition && !event.isComposing) {
      event.preventDefault();
      (event.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
    }
    if (event.key === 'Backspace' && activeText === '' && activeFiles.length > 0) {
      event.preventDefault();
      const last = activeFiles.at(-1);
      if (last) removeFile(last.id, activeFiles.length - 1);
    }
  }

  function handlePaste(event: ClipboardEvent): void {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length > 0) { event.preventDefault(); addFiles(files); }
  }

  function registerFileInput(input: HTMLInputElement | null, open?: () => void): void {
    parentController?.registerFileInput(input, open);
  }

  const localController = {
    textInput: {
      get value() { return activeText; },
      setInput: setValue,
      clear() { setValue(''); },
    },
    attachments: {
      get files() { return activeFiles; },
      add: addFiles,
      remove: (id: string) => removeFile(id, activeFiles.findIndex((item) => item.id === id)),
      clear: clearFiles,
      openFileDialog,
      get fileInputRef() { return inputElement; },
    },
    get syncHiddenInput() { return syncHiddenInput; },
    registerFileInput,
  };
  providePromptInputController(localController);

  const references: PromptInputReferencedSourcesContext = {
    get sources() { return referencedSources; },
    add(source) {
      const incoming = Array.isArray(source) ? source : [source];
      referencedSources = [...referencedSources, ...incoming.map((item, index) => ({ ...item, id: item.id ?? `${componentId}-source-${Date.now()}-${index}` }))];
    },
    remove(id) { referencedSources = referencedSources.filter((item) => item.id !== id); },
    clear() { referencedSources = []; },
  };
  providePromptInputReferences(references);
  $effect(() => {
    if (!parentController) return;
    parentController.registerFileInput(inputElement, openFileDialog);
    return () => parentController.registerFileInput(null);
  });

  $effect(() => {
    if (!globalDrop || typeof document === 'undefined') return;
    const onDragOver = (event: DragEvent) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); };
    const onDrop = (event: DragEvent) => { if (event.dataTransfer?.files.length) { event.preventDefault(); addFiles(event.dataTransfer.files); } };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => { document.removeEventListener('dragover', onDragOver); document.removeEventListener('drop', onDrop); };
  });

  $effect(() => {
    if (usingProvider) return;
    const incoming = attachments.map((item) => {
      const current = localFiles.find((file) => file.id === item.id && file.url === item.url);
      return { ...item, filename: item.name, previewUrlOwned: current?.previewUrlOwned };
    });
    const unchanged = incoming.length === localFiles.length && incoming.every((item, index) => {
      const current = localFiles[index];
      return current?.id === item.id
        && current.name === item.name
        && current.mediaType === item.mediaType
        && current.url === item.url
        && current.size === item.size
        && current.file === item.file;
    });
    if (unchanged) return;
    for (const file of localFiles) {
      const replacement = incoming.find((item) => item.id === file.id);
      if (!replacement || replacement.url !== file.url) revokePromptInputFile(file);
    }
    localFiles = incoming;
  });

  onDestroy(() => {
    if (!usingProvider) for (const file of localFiles) revokePromptInputFile(file);
  });
</script>

<form
  {...rest}
  class={cn('svadmin-ai svadmin-ai__surface flex flex-col gap-2 p-2', className)}
  aria-label={formAriaLabel ?? ariaLabel}
  data-slot="prompt-input"
  onsubmit={submit}
>
  <input bind:this={inputElement} class="svadmin-ai__sr-only" type="file" {accept} {multiple} disabled={disabled} aria-label="Upload files" onchange={(event) => addFiles((event.currentTarget as HTMLInputElement).files ?? [])} />
  {#if syncHiddenInput}<input type="hidden" name="message" value={activeText} />{/if}
  {#if activeFiles.length > 0 && !children}
    <ul class="flex flex-wrap gap-2" aria-label="Attachments">
      {#each activeFiles as file, index (file.id)}
        <li class="flex min-w-0 items-center gap-1 rounded border border-border px-2 py-1 text-xs">
          <span class="max-w-48 truncate" title={file.name}>{file.name}</span>
          <button type="button" class="svadmin-ai__button svadmin-ai__button--ghost size-6 min-h-6 p-0" aria-label={`Remove ${file.name}`} title={`Remove ${file.name}`} onclick={() => removeFile(file.id, index)}><X size={13} aria-hidden="true" /></button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if errorMessage}<p class="text-destructive text-xs" role="alert">{errorMessage}</p>{/if}
  {#if children}{@render children()}{:else}
    <textarea class="svadmin-ai__textarea min-h-20 border-0 bg-transparent outline-none" name={syncHiddenInput ? undefined : 'message'} value={activeText} {disabled} maxlength={maxLength} {placeholder} aria-label={ariaLabel} oninput={(event) => setValue(event.currentTarget.value)} onkeydown={handleKeydown} onpaste={handlePaste} oncompositionstart={() => composition = true} oncompositionend={() => composition = false}></textarea>
    <div class="flex items-center justify-between gap-2">
      <button type="button" class="svadmin-ai__button svadmin-ai__button--ghost size-8 min-h-8 p-0" aria-label="Add attachments" title="Add attachments" disabled={disabled} onclick={openFileDialog}><Paperclip size={15} aria-hidden="true" /></button>
      {#if busy}<button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-3" onclick={() => onstop?.()}><Square size={13} fill="currentColor" aria-hidden="true" /> Stop</button>{:else}<button type="submit" class="svadmin-ai__button min-h-8 px-3" disabled={!canSubmit}><Send size={14} aria-hidden="true" /> Send</button>{/if}
    </div>
  {/if}
</form>
