<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import {
    TableIcon, Plus, Minus, Trash2,
    MergeIcon, SplitIcon,
    ArrowDownToLine, ArrowRightToLine,
  } from '@lucide/svelte';
  import ToolbarButton from './ToolbarButton.svelte';
  import { t } from '@svadmin/core';

  let { editor, onclose }: {
    editor: Editor;
    onclose?: () => void;
  } = $props();

  const isInTable = $derived(editor.isActive('table'));

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    onclose?.();
  }

  function addRowBefore() { editor.chain().focus().addRowBefore().run(); }
  function addRowAfter() { editor.chain().focus().addRowAfter().run(); }
  function deleteRow() { editor.chain().focus().deleteRow().run(); }
  function addColumnBefore() { editor.chain().focus().addColumnBefore().run(); }
  function addColumnAfter() { editor.chain().focus().addColumnAfter().run(); }
  function deleteColumn() { editor.chain().focus().deleteColumn().run(); }
  function mergeCells() { editor.chain().focus().mergeCells().run(); }
  function splitCell() { editor.chain().focus().splitCell().run(); }
  function deleteTable() { editor.chain().focus().deleteTable().run(); onclose?.(); }
  function toggleHeaderRow() { editor.chain().focus().toggleHeaderRow().run(); }
</script>

{#if !isInTable}
  <ToolbarButton title={t('editor.table')} onclick={insertTable}>
    <TableIcon />
  </ToolbarButton>
{:else}
  <div class="svadmin-color-picker" style="min-width: 180px;">
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="font-size: 11px; font-weight: 600; color: var(--editor-muted); padding: 2px 4px; text-transform: uppercase; letter-spacing: 0.05em;">
        Rows
      </div>
      <div style="display: flex; gap: 2px;">
        <ToolbarButton title={t('editor.table.insertRowAbove')} onclick={addRowBefore}>
          <Plus />
        </ToolbarButton>
        <ToolbarButton title={t('editor.table.insertRowBelow')} onclick={addRowAfter}>
          <ArrowDownToLine />
        </ToolbarButton>
        <ToolbarButton title={t('editor.table.deleteRow')} onclick={deleteRow}>
          <Minus />
        </ToolbarButton>
      </div>

      <div style="font-size: 11px; font-weight: 600; color: var(--editor-muted); padding: 2px 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">
        Columns
      </div>
      <div style="display: flex; gap: 2px;">
        <ToolbarButton title={t('editor.table.insertColumnLeft')} onclick={addColumnBefore}>
          <Plus />
        </ToolbarButton>
        <ToolbarButton title={t('editor.table.insertColumnRight')} onclick={addColumnAfter}>
          <ArrowRightToLine />
        </ToolbarButton>
        <ToolbarButton title={t('editor.table.deleteColumn')} onclick={deleteColumn}>
          <Minus />
        </ToolbarButton>
      </div>

      <div style="font-size: 11px; font-weight: 600; color: var(--editor-muted); padding: 2px 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">
        Cells
      </div>
      <div style="display: flex; gap: 2px;">
        <ToolbarButton title={t('editor.table.mergeCells')} onclick={mergeCells}>
          <MergeIcon />
        </ToolbarButton>
        <ToolbarButton title="Split cell" onclick={splitCell}>
          <SplitIcon />
        </ToolbarButton>
        <ToolbarButton title="Toggle header row" onclick={toggleHeaderRow}>
          <TableIcon />
        </ToolbarButton>
      </div>

      <div style="border-top: 1px solid var(--editor-border); margin-top: 4px; padding-top: 4px;">
        <ToolbarButton title={t('editor.table.deleteTable')} onclick={deleteTable}>
          <Trash2 />
        </ToolbarButton>
      </div>
    </div>
  </div>
{/if}
