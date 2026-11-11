<script lang="ts">
  import { Columns2, AlignJustify, Copy, Check, Eye, EyeOff, Plus, Minus } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type DiffViewMode = 'split' | 'unified';

  export interface DiffLine {
    type: 'unchanged' | 'added' | 'deleted';
    oldLineNo: number | null;
    newLineNo: number | null;
    text: string;
  }

  export interface SplitRow {
    left: DiffLine | null;
    right: DiffLine | null;
    isFoldNotice?: boolean;
    hiddenCount?: number;
  }

  export interface TextDiffViewerProps {
    /** 变更前的原始文本 */
    oldText: string;
    /** 变更后的最新文本 */
    newText: string;
    /** 变更前标题，默认 "变更前 (Baseline)" */
    oldTitle?: string | undefined;
    /** 变更后标题，默认 "变更后 (Current)" */
    newTitle?: string | undefined;
    /** 视图模式：'split'（双栏并排）或 'unified'（单栏内联），默认 'split' */
    viewMode?: DiffViewMode | undefined;
    /** 是否显示顶部操作栏及统计信息，默认 true */
    showHeader?: boolean | undefined;
    /** 是否默认折叠未变更的上下文行，默认 false */
    collapseUnchanged?: boolean | undefined;
    /** 折叠模式下在差异行前后保留的上下文行数，默认 3 */
    contextLines?: number | undefined;
    /** 字体风格，默认 'mono' */
    fontFamily?: ('mono' | 'sans') | undefined;
    /** 内部视图最大高度，如 "480px" */
    maxHeight?: string | undefined;
    class?: string | undefined;
  }

  let {
    oldText = '',
    newText = '',
    oldTitle = '变更前 (Baseline)',
    newTitle = '变更后 (Current)',
    viewMode = 'split',
    showHeader = true,
    collapseUnchanged = false,
    contextLines = 3,
    fontFamily = 'mono',
    maxHeight,
    class: className = '',
  }: TextDiffViewerProps = $props();

  let currentMode = $derived<DiffViewMode>(viewMode);
  let isCollapsed = $derived<boolean>(collapseUnchanged);
  let copiedSide = $state<'old' | 'new' | null>(null);



  function computeLineDiff(leftStr: string, rightStr: string): DiffLine[] {
    const oldLines = leftStr.split(/\r?\n/u);
    const newLines = rightStr.split(/\r?\n/u);

    // Strip shared prefix and suffix to shrink DP table size
    let prefix = 0;
    while (
      prefix < oldLines.length &&
      prefix < newLines.length &&
      oldLines[prefix] === newLines[prefix]
    ) {
      prefix++;
    }

    let oldEnd = oldLines.length - 1;
    let newEnd = newLines.length - 1;
    while (oldEnd >= prefix && newEnd >= prefix && oldLines[oldEnd] === newLines[newEnd]) {
      oldEnd--;
      newEnd--;
    }

    const result: DiffLine[] = [];

    for (let i = 0; i < prefix; i++) {
      result.push({
        type: 'unchanged',
        oldLineNo: i + 1,
        newLineNo: i + 1,
        text: oldLines[i] ?? '',
      });
    }

    const midOld = oldLines.slice(prefix, oldEnd + 1);
    const midNew = newLines.slice(prefix, newEnd + 1);
    const m = midOld.length;
    const n = midNew.length;

    if (m === 0 && n > 0) {
      for (let j = 0; j < n; j++) {
        result.push({
          type: 'added',
          oldLineNo: null,
          newLineNo: prefix + j + 1,
          text: midNew[j] ?? '',
        });
      }
    } else if (n === 0 && m > 0) {
      for (let i = 0; i < m; i++) {
        result.push({
          type: 'deleted',
          oldLineNo: prefix + i + 1,
          newLineNo: null,
          text: midOld[i] ?? '',
        });
      }
    } else if (m > 0 && n > 0) {
      if (m * n <= 250000) {
        // Standard LCS DP matrix for accurate diffing
        const dp: Int32Array[] = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
        for (let i = m - 1; i >= 0; i--) {
          const row = dp[i];
          const nextRow = dp[i + 1];
          if (!row || !nextRow) continue;
          for (let j = n - 1; j >= 0; j--) {
            if (midOld[i] === midNew[j]) {
              row[j] = (nextRow[j + 1] ?? 0) + 1;
            } else {
              row[j] = Math.max(nextRow[j] ?? 0, row[j + 1] ?? 0);
            }
          }
        }

        let i = 0;
        let j = 0;
        while (i < m && j < n) {
          if (midOld[i] === midNew[j]) {
            result.push({
              type: 'unchanged',
              oldLineNo: prefix + i + 1,
              newLineNo: prefix + j + 1,
              text: midOld[i] ?? '',
            });
            i++;
            j++;
          } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
            result.push({
              type: 'deleted',
              oldLineNo: prefix + i + 1,
              newLineNo: null,
              text: midOld[i] ?? '',
            });
            i++;
          } else {
            result.push({
              type: 'added',
              oldLineNo: null,
              newLineNo: prefix + j + 1,
              text: midNew[j] ?? '',
            });
            j++;
          }
        }
        while (i < m) {
          result.push({
            type: 'deleted',
            oldLineNo: prefix + i + 1,
            newLineNo: null,
            text: midOld[i] ?? '',
          });
          i++;
        }
        while (j < n) {
          result.push({
            type: 'added',
            oldLineNo: null,
            newLineNo: prefix + j + 1,
            text: midNew[j] ?? '',
          });
          j++;
        }
      } else {
        // Fallback linear diff for huge texts to prevent memory spikes
        for (let i = 0; i < m; i++) {
          result.push({
            type: 'deleted',
            oldLineNo: prefix + i + 1,
            newLineNo: null,
            text: midOld[i] ?? '',
          });
        }
        for (let j = 0; j < n; j++) {
          result.push({
            type: 'added',
            oldLineNo: null,
            newLineNo: prefix + j + 1,
            text: midNew[j] ?? '',
          });
        }
      }
    }

    const suffixCount = oldLines.length - 1 - oldEnd;
    for (let k = 0; k < suffixCount; k++) {
      result.push({
        type: 'unchanged',
        oldLineNo: oldEnd + 1 + k + 1,
        newLineNo: newEnd + 1 + k + 1,
        text: oldLines[oldEnd + 1 + k] ?? '',
      });
    }

    return result;
  }

  const diffLines = $derived.by(() => computeLineDiff(oldText, newText));

  const stats = $derived.by(() => {
    let added = 0;
    let deleted = 0;
    let unchanged = 0;
    for (const line of diffLines) {
      if (line.type === 'added') added++;
      else if (line.type === 'deleted') deleted++;
      else unchanged++;
    }
    return { added, deleted, unchanged };
  });

  const visibleMask = $derived.by(() => {
    if (!isCollapsed) return diffLines.map(() => true);
    const mask = new Array<boolean>(diffLines.length).fill(false);
    const hasAnyDiff = diffLines.some((l) => l.type !== 'unchanged');
    if (!hasAnyDiff) {
      // If completely identical, show top contextLines
      for (let i = 0; i < Math.min(contextLines, diffLines.length); i++) mask[i] = true;
      return mask;
    }
    for (let i = 0; i < diffLines.length; i++) {
      if (diffLines[i]?.type !== 'unchanged') {
        const start = Math.max(0, i - contextLines);
        const end = Math.min(diffLines.length - 1, i + contextLines);
        for (let k = start; k <= end; k++) mask[k] = true;
      }
    }
    return mask;
  });

  const splitRows = $derived.by<SplitRow[]>(() => {
    const rows: SplitRow[] = [];
    let i = 0;

    while (i < diffLines.length) {
      if (!visibleMask[i]) {
        let hiddenCount = 0;
        while (i < diffLines.length && !visibleMask[i]) {
          hiddenCount++;
          i++;
        }
        rows.push({ left: null, right: null, isFoldNotice: true, hiddenCount });
        continue;
      }

      const line = diffLines[i];
      if (!line) {
        i++;
        continue;
      }

      if (line.type === 'unchanged') {
        rows.push({ left: line, right: line });
        i++;
      } else {
        // Pair consecutive deleted & added blocks side-by-side
        const deletedBlock: DiffLine[] = [];
        const addedBlock: DiffLine[] = [];
        while (i < diffLines.length && diffLines[i]?.type === 'deleted' && visibleMask[i]) {
          const item = diffLines[i];
          if (item) deletedBlock.push(item);
          i++;
        }
        while (i < diffLines.length && diffLines[i]?.type === 'added' && visibleMask[i]) {
          const item = diffLines[i];
          if (item) addedBlock.push(item);
          i++;
        }

        const maxLen = Math.max(deletedBlock.length, addedBlock.length);
        for (let k = 0; k < maxLen; k++) {
          rows.push({
            left: deletedBlock[k] ?? null,
            right: addedBlock[k] ?? null,
          });
        }
      }
    }

    return rows;
  });

  const unifiedEntries = $derived.by(() => {
    const entries: Array<{ line?: DiffLine; isFoldNotice?: boolean; hiddenCount?: number }> = [];
    let i = 0;
    while (i < diffLines.length) {
      if (!visibleMask[i]) {
        let hiddenCount = 0;
        while (i < diffLines.length && !visibleMask[i]) {
          hiddenCount++;
          i++;
        }
        entries.push({ isFoldNotice: true, hiddenCount });
        continue;
      }
      const line = diffLines[i];
      if (line) entries.push({ line });
      i++;
    }
    return entries;
  });

  async function copyContent(side: 'old' | 'new') {
    const text = side === 'old' ? oldText : newText;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        copiedSide = side;
        setTimeout(() => {
          if (copiedSide === side) copiedSide = null;
        }, 1800);
      } catch {
        // Fallback ignore
      }
    }
  }
</script>

<div
  class={cn('rounded-lg border border-border bg-card text-card-foreground overflow-hidden shadow-xs', className)}
  data-svadmin-component="TextDiffViewer"
>
  {#if showHeader}
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2.5 text-xs">
      <div class="flex items-center gap-3">
        <span class="font-semibold text-foreground">文本差异对比</span>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono font-medium bg-success/10 text-success">
            <Plus class="h-3 w-3" />
            {stats.added} 新增
          </span>
          <span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono font-medium bg-destructive/10 text-destructive">
            <Minus class="h-3 w-3" />
            {stats.deleted} 删除
          </span>
          <span class="text-muted-foreground font-mono">
            {stats.unchanged} 未变更
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class={cn(
            'inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors cursor-pointer',
            isCollapsed
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
          onclick={() => (isCollapsed = !isCollapsed)}
          title={isCollapsed ? '展开所有未修改行' : '折叠未修改的上下文行'}
        >
          {#if isCollapsed}
            <Eye class="h-3.5 w-3.5" />
            <span>展开全部</span>
          {:else}
            <EyeOff class="h-3.5 w-3.5" />
            <span>只看差异</span>
          {/if}
        </button>

        <div class="flex items-center rounded border border-border bg-background p-0.5">
          <button
            type="button"
            class={cn(
              'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer',
              currentMode === 'split'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onclick={() => (currentMode = 'split')}
          >
            <Columns2 class="h-3.5 w-3.5" />
            <span>双栏</span>
          </button>
          <button
            type="button"
            class={cn(
              'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer',
              currentMode === 'unified'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onclick={() => (currentMode = 'unified')}
          >
            <AlignJustify class="h-3.5 w-3.5" />
            <span>单栏</span>
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if currentMode === 'split'}
    <div class="grid grid-cols-2 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
      <div class="flex items-center justify-between border-r border-border px-3 py-1.5">
        <span class="truncate">{oldTitle}</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onclick={() => copyContent('old')}
          aria-label="Copy baseline text"
        >
          {#if copiedSide === 'old'}
            <Check class="h-3 w-3 text-success" />
            <span class="text-success">已复制</span>
          {:else}
            <Copy class="h-3 w-3" />
            <span>复制</span>
          {/if}
        </button>
      </div>
      <div class="flex items-center justify-between px-3 py-1.5">
        <span class="truncate">{newTitle}</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onclick={() => copyContent('new')}
          aria-label="Copy current text"
        >
          {#if copiedSide === 'new'}
            <Check class="h-3 w-3 text-success" />
            <span class="text-success">已复制</span>
          {:else}
            <Copy class="h-3 w-3" />
            <span>复制</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <div
    class={cn('overflow-auto text-xs leading-relaxed', fontFamily === 'mono' ? 'font-mono' : 'font-sans')}
    style={maxHeight ? `max-height: ${maxHeight}` : undefined}
  >
    {#if currentMode === 'split'}
      <table class="w-full border-collapse table-fixed">
        <tbody>
          {#each splitRows as row, idx (idx)}
            {#if row.isFoldNotice}
              <tr class="bg-muted/30 text-center text-muted-foreground border-y border-border/60">
                <td colspan="4" class="py-1 text-[11px]">
                  <button
                    type="button"
                    class="underline hover:text-foreground cursor-pointer"
                    onclick={() => (isCollapsed = false)}
                  >
                    ⋯ 已折叠 {row.hiddenCount} 行未变更内容（点击展开） ⋯
                  </button>
                </td>
              </tr>
            {:else}
              <tr class="border-b border-border/40 last:border-b-0">
                <!-- Left Column (Old) -->
                <td
                  class={cn(
                    'w-10 select-none text-right px-2 py-0.5 border-r border-border/50 align-top',
                    row.left?.type === 'deleted'
                      ? 'bg-destructive/15 text-destructive font-semibold'
                      : row.left
                        ? 'bg-muted/20 text-muted-foreground'
                        : 'bg-muted/30'
                  )}
                >
                  {row.left?.oldLineNo ?? ''}
                </td>
                <td
                  class={cn(
                    'w-[calc(50%-2.5rem)] px-2.5 py-0.5 border-r border-border whitespace-pre-wrap break-all align-top',
                    row.left?.type === 'deleted'
                      ? 'bg-destructive/10 text-destructive'
                      : row.left
                        ? 'text-foreground'
                        : 'bg-muted/20'
                  )}
                >
                  {#if row.left?.type === 'deleted'}
                    <span class="select-none mr-1.5 opacity-70">-</span>
                  {:else if row.left}
                    <span class="select-none mr-1.5 opacity-0"> </span>
                  {/if}
                  {row.left?.text ?? ''}
                </td>

                <!-- Right Column (New) -->
                <td
                  class={cn(
                    'w-10 select-none text-right px-2 py-0.5 border-r border-border/50 align-top',
                    row.right?.type === 'added'
                      ? 'bg-success/15 text-success font-semibold'
                      : row.right
                        ? 'bg-muted/20 text-muted-foreground'
                        : 'bg-muted/30'
                  )}
                >
                  {row.right?.newLineNo ?? ''}
                </td>
                <td
                  class={cn(
                    'w-[calc(50%-2.5rem)] px-2.5 py-0.5 whitespace-pre-wrap break-all align-top',
                    row.right?.type === 'added'
                      ? 'bg-success/10 text-success'
                      : row.right
                        ? 'text-foreground'
                        : 'bg-muted/20'
                  )}
                >
                  {#if row.right?.type === 'added'}
                    <span class="select-none mr-1.5 opacity-70">+</span>
                  {:else if row.right}
                    <span class="select-none mr-1.5 opacity-0"> </span>
                  {/if}
                  {row.right?.text ?? ''}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {:else}
      <!-- Unified Mode -->
      <table class="w-full border-collapse">
        <tbody>
          {#each unifiedEntries as entry, idx (idx)}
            {#if entry.isFoldNotice}
              <tr class="bg-muted/30 text-center text-muted-foreground border-y border-border/60">
                <td colspan="3" class="py-1 text-[11px]">
                  <button
                    type="button"
                    class="underline hover:text-foreground cursor-pointer"
                    onclick={() => (isCollapsed = false)}
                  >
                    ⋯ 已折叠 {entry.hiddenCount} 行未变更内容（点击展开） ⋯
                  </button>
                </td>
              </tr>
            {:else if entry.line}
              {@const line = entry.line}
              <tr class="border-b border-border/40 last:border-b-0">
                <td
                  class={cn(
                    'w-10 select-none text-right px-2 py-0.5 border-r border-border/50 align-top',
                    line.type === 'deleted'
                      ? 'bg-destructive/15 text-destructive'
                      : line.type === 'added'
                        ? 'bg-success/15 text-success'
                        : 'bg-muted/20 text-muted-foreground'
                  )}
                >
                  {line.oldLineNo ?? ''}
                </td>
                <td
                  class={cn(
                    'w-10 select-none text-right px-2 py-0.5 border-r border-border/50 align-top',
                    line.type === 'deleted'
                      ? 'bg-destructive/15 text-destructive'
                      : line.type === 'added'
                        ? 'bg-success/15 text-success'
                        : 'bg-muted/20 text-muted-foreground'
                  )}
                >
                  {line.newLineNo ?? ''}
                </td>
                <td
                  class={cn(
                    'px-2.5 py-0.5 whitespace-pre-wrap break-all align-top',
                    line.type === 'added'
                      ? 'bg-success/10 text-success'
                      : line.type === 'deleted'
                        ? 'bg-destructive/10 text-destructive'
                        : 'text-foreground'
                  )}
                >
                  {#if line.type === 'added'}
                    <span class="select-none mr-1.5 font-semibold">+</span>
                  {:else if line.type === 'deleted'}
                    <span class="select-none mr-1.5 font-semibold">-</span>
                  {:else}
                    <span class="select-none mr-1.5 opacity-0"> </span>
                  {/if}
                  {line.text}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
