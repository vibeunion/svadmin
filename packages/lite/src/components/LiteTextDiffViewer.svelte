<script lang="ts">
  interface Props {
    oldText?: string;
    newText?: string;
    oldTitle?: string;
    newTitle?: string;
    class?: string;
  }

  let {
    oldText = '',
    newText = '',
    oldTitle = 'Baseline',
    newTitle = 'Current',
    class: className = '',
  }: Props = $props();

  interface DiffEntry {
    type: 'same' | 'add' | 'del';
    lineNo: number;
    text: string;
  }

  const diffEntries = $derived.by<DiffEntry[]>(() => {
    const oldLines = oldText.split(/\r?\n/u);
    const newLines = newText.split(/\r?\n/u);
    const result: DiffEntry[] = [];

    let lineCounter = 1;
    let i = 0;
    let j = 0;

    while (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        result.push({ type: 'same', lineNo: lineCounter++, text: oldLines[i] ?? '' });
        i++;
        j++;
      } else {
        result.push({ type: 'del', lineNo: lineCounter++, text: oldLines[i] ?? '' });
        result.push({ type: 'add', lineNo: lineCounter++, text: newLines[j] ?? '' });
        i++;
        j++;
      }
    }
    while (i < oldLines.length) {
      result.push({ type: 'del', lineNo: lineCounter++, text: oldLines[i] ?? '' });
      i++;
    }
    while (j < newLines.length) {
      result.push({ type: 'add', lineNo: lineCounter++, text: newLines[j] ?? '' });
      j++;
    }

    return result;
  });
</script>

<div
  class="lite-text-diff {className}"
  data-svadmin-component="LiteTextDiffViewer"
  role="region"
  aria-label="Text Diff"
>
  <header class="lite-diff-header">
    <span class="lite-diff-title">{oldTitle} ↔ {newTitle}</span>
  </header>

  <div class="lite-diff-body">
    <table class="lite-diff-table">
      <tbody>
        {#each diffEntries as entry (entry.lineNo)}
          <tr class="lite-diff-row lite-diff-{entry.type}">
            <td class="lite-diff-line-no">{entry.lineNo}</td>
            <td class="lite-diff-sign">
              {#if entry.type === 'add'}+{/if}
              {#if entry.type === 'del'}-{/if}
            </td>
            <td class="lite-diff-content">{entry.text}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-text-diff {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-family: monospace;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-diff-header {
    padding: 8px 12px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
    font-weight: 600;
    color: #4e5969;
  }
  .lite-diff-body { max-height: 400px; overflow: auto; }
  .lite-diff-table { width: 100%; border-collapse: collapse; }
  .lite-diff-row td { padding: 2px 6px; }
  .lite-diff-line-no { width: 40px; text-align: right; color: #86909c; user-select: none; border-right: 1px solid #f2f3f5; }
  .lite-diff-sign { width: 20px; text-align: center; font-weight: 700; user-select: none; }
  .lite-diff-content { white-space: pre-wrap; word-break: break-all; }
  .lite-diff-add { background: #e8ffea; color: #00b42a; }
  .lite-diff-del { background: #ffece8; color: #f53f3f; }
  .lite-diff-same { color: #1d2129; }
</style>
