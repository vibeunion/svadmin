<script module lang="ts">
  import type { Snippet } from 'svelte';
  export interface PromptInputProviderProps { initialInput?: string; children?: Snippet; }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    providePromptInputController,
    provideProviderAttachments,
    type PromptInputFile,
  } from './context.svelte.js';
  import { createPromptInputFiles, revokePromptInputFile } from './files.js';

  let { initialInput = '', children }: PromptInputProviderProps = $props();
  let value = $state('');
  let files = $state<PromptInputFile[]>([]);
  let fileInput: HTMLInputElement | null = $state(null);
  let openFile = $state<(() => void) | undefined>();
  let initialized = false;

  $effect.pre(() => {
    if (initialized) return;
    initialized = true;
    value = initialInput;
  });

  function add(incoming: File[] | FileList): PromptInputFile[] {
    const next = createPromptInputFiles(Array.from(incoming), files);
    files = [...files, ...next];
    return next;
  }

  function remove(id: string): void {
    const item = files.find((file) => file.id === id);
    if (item) revokePromptInputFile(item);
    files = files.filter((file) => file.id !== id);
  }

  function clear(): void {
    for (const item of files) revokePromptInputFile(item);
    files = [];
  }

  const controller = {
    textInput: {
      get value() { return value; },
      setInput(next: string) { value = next; },
      clear() { value = ''; },
    },
    attachments: {
      get files() { return files; },
      add,
      remove,
      clear,
      openFileDialog() { openFile?.(); },
      get fileInputRef() { return fileInput; },
    },
    registerFileInput(input: HTMLInputElement | null, open?: () => void) {
      fileInput = input;
      openFile = input ? open : undefined;
    },
  };
  providePromptInputController(controller);
  provideProviderAttachments(controller.attachments);

  onDestroy(() => {
    for (const item of files) revokePromptInputFile(item);
  });
</script>

{@render children?.()}
