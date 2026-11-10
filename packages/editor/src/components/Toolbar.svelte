<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import ToolbarButton from './ToolbarButton.svelte';
  import ToolbarGroup from './ToolbarGroup.svelte';
  import ToolbarSelect from './ToolbarSelect.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import LinkPopover from './LinkPopover.svelte';
  import TableMenu from './TableMenu.svelte';
  import ImageUpload from './ImageUpload.svelte';
  import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, ListChecks,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Quote, Minus, Code, Code2,
    Undo2, Redo2,
    Link as LinkIcon, ImageIcon, TableIcon,
    Palette, Highlighter,
    Subscript, Superscript,
  } from '@lucide/svelte';
  import { t } from '@svadmin/core';

  let { editor, onUpload, preset = 'full' }: {
    editor: Editor;
    onUpload?: (file: File) => Promise<string>;
    preset?: 'full' | 'minimal' | 'prose';
  } = $props();

  // ─── Reactive state: re-read on every transaction ────────────
  let txn = $state(0);

  $effect(() => {
    const handler = () => { txn++; };
    editor.on('transaction', handler);
    return () => { editor.off('transaction', handler); };
  });

  // We use txn to make derived values reactive.
  // The `void txn` below ensures Svelte tracks the dependency.
  const isBold = $derived((void txn, editor.isActive('bold')));
  const isItalic = $derived((void txn, editor.isActive('italic')));
  const isUnderline = $derived((void txn, editor.isActive('underline')));
  const isStrike = $derived((void txn, editor.isActive('strike')));
  const isSubscript = $derived((void txn, editor.isActive('subscript')));
  const isSuperscript = $derived((void txn, editor.isActive('superscript')));
  const isBulletList = $derived((void txn, editor.isActive('bulletList')));
  const isOrderedList = $derived((void txn, editor.isActive('orderedList')));
  const isTaskList = $derived((void txn, editor.isActive('taskList')));
  const isBlockquote = $derived((void txn, editor.isActive('blockquote')));
  const isCode = $derived((void txn, editor.isActive('code')));
  const isCodeBlock = $derived((void txn, editor.isActive('codeBlock')));
  const isLink = $derived((void txn, editor.isActive('link')));
  const isTable = $derived((void txn, editor.isActive('table')));
  const isAlignLeft = $derived((void txn, editor.isActive({ textAlign: 'left' })));
  const isAlignCenter = $derived((void txn, editor.isActive({ textAlign: 'center' })));
  const isAlignRight = $derived((void txn, editor.isActive({ textAlign: 'right' })));
  const isAlignJustify = $derived((void txn, editor.isActive({ textAlign: 'justify' })));

  const currentHeading = $derived((void txn, (() => {
    for (let i = 1; i <= 4; i++) {
      if (editor.isActive('heading', { level: i })) return String(i);
    }
    return '0';
  })()));

  const canUndo = $derived((void txn, editor.can().undo()));
  const canRedo = $derived((void txn, editor.can().redo()));

  // ─── Popover states ──────────────────────────────────────────
  let showTextColor = $state(false);
  let showHighlight = $state(false);
  let showLink = $state(false);
  let showTable = $state(false);
  let showImage = $state(false);

  function closeAll() {
    showTextColor = false;
    showHighlight = false;
    showLink = false;
    showTable = false;
    showImage = false;
  }

  function togglePopover(name: 'textColor' | 'highlight' | 'link' | 'table' | 'image') {
    const prev = {
      textColor: showTextColor,
      highlight: showHighlight,
      link: showLink,
      table: showTable,
      image: showImage,
    }[name];
    closeAll();
    if (!prev) {
      switch (name) {
        case 'textColor': showTextColor = true; break;
        case 'highlight': showHighlight = true; break;
        case 'link': showLink = true; break;
        case 'table': showTable = true; break;
        case 'image': showImage = true; break;
      }
    }
  }

  // ─── Heading selection ───────────────────────────────────────
  const headingOptions = $derived([
    { value: '0', label: 'Paragraph' },
    { value: '1', label: t('editor.h1') },
    { value: '2', label: t('editor.h2') },
    { value: '3', label: t('editor.h3') },
    { value: '4', label: t('editor.h4') },
  ]);

  function setHeading(val: string) {
    const level = parseInt(val);
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
    }
  }

  const isFullOrProse = $derived(preset === 'full' || preset === 'prose');
</script>

<div class="svadmin-editor-toolbar">
  <!-- History -->
  <ToolbarGroup>
    <ToolbarButton title={t('editor.undo')} disabled={!canUndo} onclick={() => editor.chain().focus().undo().run()}>
      <Undo2 />
    </ToolbarButton>
    <ToolbarButton title={t('editor.redo')} disabled={!canRedo} onclick={() => editor.chain().focus().redo().run()}>
      <Redo2 />
    </ToolbarButton>
  </ToolbarGroup>

  <!-- Block type -->
  <ToolbarGroup>
    <ToolbarSelect
      title="Block type"
      value={currentHeading}
      options={headingOptions}
      onchange={setHeading}
    />
  </ToolbarGroup>

  <!-- Text formatting -->
  <ToolbarGroup>
    <ToolbarButton title={t('editor.bold')} active={isBold} onclick={() => editor.chain().focus().toggleBold().run()}>
      <Bold />
    </ToolbarButton>
    <ToolbarButton title={t('editor.italic')} active={isItalic} onclick={() => editor.chain().focus().toggleItalic().run()}>
      <Italic />
    </ToolbarButton>
    <ToolbarButton title={t('editor.underline')} active={isUnderline} onclick={() => editor.chain().focus().toggleUnderline().run()}>
      <UnderlineIcon />
    </ToolbarButton>
    <ToolbarButton title={t('editor.strikethrough')} active={isStrike} onclick={() => editor.chain().focus().toggleStrike().run()}>
      <Strikethrough />
    </ToolbarButton>
    {#if isFullOrProse}
      <ToolbarButton title="Subscript" active={isSubscript} onclick={() => editor.chain().focus().toggleSubscript().run()}>
        <Subscript />
      </ToolbarButton>
      <ToolbarButton title="Superscript" active={isSuperscript} onclick={() => editor.chain().focus().toggleSuperscript().run()}>
        <Superscript />
      </ToolbarButton>
    {/if}
  </ToolbarGroup>

  <!-- Colors -->
  {#if isFullOrProse}
    <ToolbarGroup>
      <div style="position: relative;">
        <ToolbarButton title={t('editor.color')} onclick={() => togglePopover('textColor')}>
          <Palette />
        </ToolbarButton>
        {#if showTextColor}
          <div style="position: absolute; top: 36px; left: 0; z-index: 50;">
            <ColorPicker
              onselect={(color) => {
                if (color) {
                  editor.chain().focus().setColor(color).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
                showTextColor = false;
              }}
              onclose={() => { showTextColor = false; }}
            />
          </div>
        {/if}
      </div>
      <div style="position: relative;">
        <ToolbarButton title={t('editor.highlight')} onclick={() => togglePopover('highlight')}>
          <Highlighter />
        </ToolbarButton>
        {#if showHighlight}
          <div style="position: absolute; top: 36px; left: 0; z-index: 50;">
            <ColorPicker
              onselect={(color) => {
                if (color) {
                  editor.chain().focus().toggleHighlight({ color }).run();
                } else {
                  editor.chain().focus().unsetHighlight().run();
                }
                showHighlight = false;
              }}
              onclose={() => { showHighlight = false; }}
            />
          </div>
        {/if}
      </div>
    </ToolbarGroup>
  {/if}

  <!-- Lists -->
  <ToolbarGroup>
    <ToolbarButton title={t('editor.bulletList')} active={isBulletList} onclick={() => editor.chain().focus().toggleBulletList().run()}>
      <List />
    </ToolbarButton>
    <ToolbarButton title={t('editor.orderedList')} active={isOrderedList} onclick={() => editor.chain().focus().toggleOrderedList().run()}>
      <ListOrdered />
    </ToolbarButton>
    {#if isFullOrProse}
      <ToolbarButton title={t('editor.taskList')} active={isTaskList} onclick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks />
      </ToolbarButton>
    {/if}
  </ToolbarGroup>

  <!-- Alignment -->
  {#if isFullOrProse}
    <ToolbarGroup>
      <ToolbarButton title={t('editor.alignLeft')} active={isAlignLeft} onclick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft />
      </ToolbarButton>
      <ToolbarButton title={t('editor.alignCenter')} active={isAlignCenter} onclick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter />
      </ToolbarButton>
      <ToolbarButton title={t('editor.alignRight')} active={isAlignRight} onclick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight />
      </ToolbarButton>
      <ToolbarButton title={t('editor.alignJustify')} active={isAlignJustify} onclick={() => editor.chain().focus().setTextAlign('justify').run()}>
        <AlignJustify />
      </ToolbarButton>
    </ToolbarGroup>
  {/if}

  <!-- Block elements -->
  <ToolbarGroup>
    <ToolbarButton title={t('editor.blockquote')} active={isBlockquote} onclick={() => editor.chain().focus().toggleBlockquote().run()}>
      <Quote />
    </ToolbarButton>
    <ToolbarButton title={t('editor.code')} active={isCode} onclick={() => editor.chain().focus().toggleCode().run()}>
      <Code />
    </ToolbarButton>
    <ToolbarButton title={t('editor.codeBlock')} active={isCodeBlock} onclick={() => editor.chain().focus().toggleCodeBlock().run()}>
      <Code2 />
    </ToolbarButton>
    <ToolbarButton title="Horizontal rule" onclick={() => editor.chain().focus().setHorizontalRule().run()}>
      <Minus />
    </ToolbarButton>
  </ToolbarGroup>

  <!-- Insert: Link, Image, Table -->
  <ToolbarGroup>
    <div style="position: relative;">
      <ToolbarButton title={t('editor.link')} active={isLink} onclick={() => togglePopover('link')}>
        <LinkIcon />
      </ToolbarButton>
      {#if showLink}
        <div style="position: absolute; top: 36px; left: 0; z-index: 50;">
          <LinkPopover {editor} onclose={() => { showLink = false; }} />
        </div>
      {/if}
    </div>

    <div style="position: relative;">
      <ToolbarButton title={t('editor.image')} onclick={() => togglePopover('image')}>
        <ImageIcon />
      </ToolbarButton>
      {#if showImage}
        <div style="position: absolute; top: 36px; right: 0; z-index: 50;">
          <ImageUpload {editor} {onUpload} onclose={() => { showImage = false; }} />
        </div>
      {/if}
    </div>

    {#if preset === 'full'}
      <div style="position: relative;">
        {#if isTable}
          <ToolbarButton title={t('editor.table')} active={true} onclick={() => togglePopover('table')}>
            <TableIcon />
          </ToolbarButton>
          {#if showTable}
            <div style="position: absolute; top: 36px; right: 0; z-index: 50;">
              <TableMenu {editor} onclose={() => { showTable = false; }} />
            </div>
          {/if}
        {:else}
          <ToolbarButton
            title={t('editor.table')}
            onclick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon />
          </ToolbarButton>
        {/if}
      </div>
    {/if}
  </ToolbarGroup>
</div>
