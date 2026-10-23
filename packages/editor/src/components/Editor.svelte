<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { AnyExtension } from '@tiptap/core';
  import type { Lowlight } from '../extensions/index.js';

  export interface EditorProps extends Pick<HTMLAttributes<HTMLDivElement>,
    'id' | 'aria-label' | 'aria-labelledby' | 'aria-invalid' | 'aria-describedby' | 'aria-required'> {
    /** HTML string content (bindable) */
    value?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the editor is editable */
    editable?: boolean;
    /** Autofocus on mount */
    autofocus?: boolean | 'start' | 'end';
    /** Max character count */
    maxLength?: number;
    /** Show toolbar */
    showToolbar?: boolean;
    /** Show bubble menu on text selection */
    showBubbleMenu?: boolean;
    /** Show floating menu on empty lines */
    showFloatingMenu?: boolean;
    /** Show character count in footer */
    showCharCount?: boolean;
    /** Extension preset */
    preset?: 'full' | 'minimal' | 'prose';
    /** Custom extensions (overrides preset) */
    extensions?: AnyExtension[];
    /** Image upload handler */
    onUpload?: (file: File) => Promise<string>;
    /** Called on every content change */
    onchange?: (html: string) => void;
    /** Additional CSS class for the wrapper */
    class?: string;
    /** Min height for the editor content area */
    minHeight?: string;
    /** Max height for the editor content area */
    maxHeight?: string;
    /** 禁用编辑但保留当前 HTML 值。 */
    disabled?: boolean;
    /** lowlight instance for syntax-highlighted code blocks */
    lowlight?: Lowlight;
  }
</script>

<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { Editor as TiptapEditor } from '@tiptap/core';
  import { fullPreset, minimalPreset, prosePreset, type EditorPresetOptions } from '../extensions/index.js';
  import Toolbar from './Toolbar.svelte';
  import BubbleMenuComp from './BubbleMenu.svelte';
  import FloatingMenuComp from './FloatingMenu.svelte';
  import { t } from '@svadmin/core';
  import { RotateCw, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import '../styles/editor.css';

  let {
    value = $bindable(''),
    placeholder = t('editor.startWriting'),
    editable = true,
    autofocus = false,
    maxLength = 0,
    showToolbar = true,
    showBubbleMenu = true,
    showFloatingMenu = true,
    showCharCount = true,
    preset = 'full',
    extensions: customExtensions,
    onUpload,
    onchange,
    class: className = '',
    minHeight = '200px',
    maxHeight = '600px',
    id,
    disabled = false,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-required': ariaRequired,
    lowlight,
  }: EditorProps = $props();

  let editorElement: HTMLDivElement | undefined = $state();
  let editor: TiptapEditor | null = $state(null);
  let editorGeneration = 0;
  let uploadTaskId = 0;
  let uploadTasks = $state<UploadTask[]>([]);
  const canEdit = $derived(editable && !disabled);
  const extensionPreset = $derived(preset);
  const extensionPlaceholder = $derived(placeholder);
  const extensionLimit = $derived(maxLength);
  const extensionLowlight = $derived(lowlight);
  const extensionOverride = $derived(customExtensions);
  const uploadHandler = $derived(onUpload);

  interface UploadTask {
    id: number;
    file: File;
    position: number;
    end: number;
    attempt: number;
    pending: boolean;
    error: boolean;
  }

  $effect.pre(() => {
    void canEdit;
    void uploadHandler;
    editorGeneration++;
    uploadTasks = [];
  });

  function currentUpload(instance: TiptapEditor, generation: number): boolean {
    return canEdit && editor === instance && !instance.isDestroyed && editorGeneration === generation;
  }

  function updateUploadTask(id: number, update: Partial<UploadTask>): void {
    uploadTasks = uploadTasks.map(task => task.id === id ? { ...task, ...update } : task);
  }

  function removeUploadTask(id: number): void {
    uploadTasks = uploadTasks.filter(task => task.id !== id);
  }

  function insertUploadedImage(instance: TiptapEditor, task: UploadTask, url: string): void {
    const imageNode = instance.state.schema.nodes['image'];
    if (!imageNode) return;
    const safePosition = Math.max(0, Math.min(task.position, instance.state.doc.content.size));
    const safeEnd = Math.max(safePosition, Math.min(task.end, instance.state.doc.content.size));
    const transaction = instance.state.tr.replaceRangeWith(safePosition, safeEnd, imageNode.create({ src: url, alt: task.file.name }));
    instance.view.dispatch(transaction);
  }

  async function startImageUpload(instance: TiptapEditor, file: File, position: number, end = position, task?: UploadTask): Promise<void> {
    if (!onUpload || !currentUpload(instance, editorGeneration)) return;
    const currentTask = task ? uploadTasks.find(item => item.id === task.id) : {
      id: ++uploadTaskId,
      file,
      position,
      end,
      attempt: 0,
      pending: false,
      error: false,
    };
    if (!currentTask || currentTask.pending) return;
    const attempt = currentTask.attempt + 1;
    if (!task) uploadTasks = [...uploadTasks, currentTask];
    updateUploadTask(currentTask.id, { attempt, pending: true, error: false });
    const generation = editorGeneration;
    const handler = onUpload;
    try {
      const url = await handler(file);
      const active = uploadTasks.find(item => item.id === currentTask.id);
      if (!active || active.attempt !== attempt || !currentUpload(instance, generation)) return;
      insertUploadedImage(instance, active, url);
      removeUploadTask(currentTask.id);
    } catch {
      const active = uploadTasks.find(item => item.id === currentTask.id);
      if (!active || active.attempt !== attempt || !currentUpload(instance, generation)) return;
      updateUploadTask(currentTask.id, { pending: false, error: true });
    }
  }

  function retryImageUpload(task: UploadTask): void {
    if (task.pending || !editor || !canEdit) return;
    void startImageUpload(editor, task.file, task.position, task.end, task);
  }

  // Track whether we're updating externally to prevent loops
  let isUpdatingFromExternal = false;

  // Build extensions based on preset
  function buildExtensions(): AnyExtension[] {
    if (extensionOverride) return extensionOverride;

    const opts: EditorPresetOptions = definedOptions({
      placeholder: extensionPlaceholder,
      maxLength: extensionLimit,
      lowlight: extensionLowlight,
    });

    switch (extensionPreset) {
      case 'minimal': return minimalPreset(opts);
      case 'prose': return prosePreset(opts);
      case 'full':
      default: return fullPreset(opts);
    }
  }

  // Create editor when element is available
  $effect(() => {
    const element = editorElement;
    if (!element) return;
    const ext = buildExtensions();

    // 内容、反馈和禁用状态另行同步，避免普通字段更新销毁选区与编辑历史。
    const instance: TiptapEditor = untrack(() => new TiptapEditor({
      element,
      extensions: ext,
      content: value || '',
      editable: canEdit,
      autofocus: canEdit ? autofocus : false,
      editorProps: {
        attributes: {
          class: 'tiptap',
        },
        // Handle image drop
        handleDrop(view, event, slice, moved) {
          if (!canEdit || editor !== instance || !instance.schema.nodes['image']) return false;
          if (!moved && event.dataTransfer?.files?.length && onUpload) {
            const files = event.dataTransfer.files;
            let handled = false;
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            for (const file of files) {
              if (file.type.startsWith('image/')) {
                event.preventDefault();
                void startImageUpload(instance, file, pos?.pos ?? instance.state.selection.from);
                handled = true;
              }
            }
            return handled;
          }
          return false;
        },
        // Handle image paste
        handlePaste(view, event) {
          if (!canEdit || editor !== instance || !instance.schema.nodes['image']) return false;
          const items = event.clipboardData?.items;
          if (items && onUpload) {
            let handled = false;
            for (const item of items) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                  event.preventDefault();
                  void startImageUpload(instance, file, instance.state.selection.from, instance.state.selection.to);
                  handled = true;
                }
              }
            }
            return handled;
          }
          return false;
        },
      },
      onTransaction({ transaction, appendedTransactions }) {
        const transactions = [transaction, ...appendedTransactions].filter(item => item.docChanged);
        if (!transactions.length) return;
        // 跟随文档交易映射插入点，不使用异步回执到达时的鼠标坐标或当前选区。
        untrack(() => {
          uploadTasks = uploadTasks.map(task => {
            let position = task.position;
            let end = task.end;
            for (const item of transactions) {
              for (const step of item.mapping.maps) {
                let edited = false;
                step.forEach((from, to) => {
                  if (from < end && to > position) edited = true;
                });
                position = step.map(position);
                end = edited ? position : Math.max(position, step.map(end, -1));
              }
            }
            return { ...task, position, end };
          });
        });
      },
      onUpdate({ editor: e }) {
        if (isUpdatingFromExternal) return;
        const html = e.getHTML();
        value = html;
        onchange?.(html);
      },
    }));
    editor = instance;

    return () => {
      instance.destroy();
      editorGeneration++;
      uploadTasks = [];
      editor = null;
    };
  });

  // Sync external value changes into the editor
  $effect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      uploadTasks = [];
      editorGeneration++;
      isUpdatingFromExternal = true;
      editor.commands.setContent(value || '', { emitUpdate: false });
      isUpdatingFromExternal = false;
    }
  });

  // Sync editable state
  $effect(() => {
    if (editor) editor.setEditable(canEdit, false);
  });

  $effect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          class: 'tiptap',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-readonly': String(!canEdit),
          ...(disabled ? { 'aria-disabled': 'true', tabindex: '-1' } : {}),
          ...(id ? { id } : {}),
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
          ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
          ...(ariaInvalid !== undefined ? { 'aria-invalid': String(ariaInvalid) } : {}),
          ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
          ...(ariaRequired !== undefined ? { 'aria-required': String(ariaRequired) } : {}),
        },
      },
    });
  });

  // Character count
  const charCount = $derived.by(() => editor?.storage.characterCount?.characters() ?? 0);
  const wordCount = $derived.by(() => editor?.storage.characterCount?.words() ?? 0);
</script>

<div class="svadmin-editor {className}">
  {#if showToolbar && editor && canEdit}
    <Toolbar {editor} {...definedOptions({ "onUpload": onUpload })} {preset} />
  {/if}

  <div
    class="svadmin-editor-content"
    style="min-height: {minHeight}; max-height: {maxHeight};"
    bind:this={editorElement}
  ></div>

  {#if uploadTasks.length}
    <div class="svadmin-editor-upload-feedback" role="group" aria-label={t('editor.image.upload')}>
      {#each uploadTasks as task (task.id)}
        <div class="svadmin-editor-upload-item" aria-busy={task.pending}>
          <span class="svadmin-editor-upload-name">{task.file.name}</span>
          {#if task.error}
            <span role="alert">{t('common.error')}</span>
            <button type="button" class="svadmin-toolbar-btn" title={t('common.retry')} aria-label={`${t('common.retry')}: ${task.file.name}`} onclick={() => retryImageUpload(task)}>
              <RotateCw aria-hidden="true" />
            </button>
          {:else}
            <span role="status">{t('editor.image.uploading')}</span>
          {/if}
          <button type="button" class="svadmin-toolbar-btn" title={t('common.remove')} aria-label={`${t('common.remove')}: ${task.file.name}`} onclick={() => removeUploadTask(task.id)}>
            <X aria-hidden="true" />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if editor && canEdit && showBubbleMenu && preset !== 'minimal'}
    <BubbleMenuComp {editor} />
  {/if}

  {#if editor && canEdit && showFloatingMenu && preset !== 'minimal'}
    <FloatingMenuComp {editor} />
  {/if}

  {#if showCharCount && editor}
    <div class="svadmin-editor-footer">
      <span>{wordCount} words</span>
      <span>{charCount} characters{maxLength ? ` / ${maxLength}` : ''}</span>
    </div>
  {/if}
</div>
