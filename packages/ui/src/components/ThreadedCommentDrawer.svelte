<script lang="ts">
  import {
    MessageSquare,
    Send,
    Reply,
    CheckCircle2,
    Smile,
    Trash2,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import * as Sheet from './ui/sheet/index.js';

  export interface ThreadedComment {
    id: string;
    author: string;
    avatar?: string | undefined;
    content: string;
    createdAt: string;
    parentId?: string | undefined;
    isResolved?: boolean | undefined;
    reactions?: Record<string, number> | undefined;
    replies?: ThreadedComment[] | undefined;
  }

  export interface ThreadedCommentDrawerProps {
    open?: boolean | undefined;
    recordId?: string | number | undefined;
    recordTitle?: string | undefined;
    comments?: ThreadedComment[] | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onAddComment?: ((content: string, parentId?: string) => void) | undefined;
    onToggleReaction?: ((commentId: string, emoji: string) => void) | undefined;
    onToggleResolved?: ((commentId: string, resolved: boolean) => void) | undefined;
    onDeleteComment?: ((commentId: string) => void) | undefined;
  }

  let {
    open = $bindable(false),
    recordId,
    recordTitle,
    comments = [
      {
        id: 'c1',
        author: '张合规 (Auditor)',
        content: '请核实该记录附带的发票抬头与税号是否与企业开票资料完全一致。',
        createdAt: '10 分钟前',
        isResolved: false,
        reactions: { '👍': 2 },
        replies: [
          {
            id: 'c1-1',
            author: '李财务 (Finance)',
            content: '已核验完毕，金税四期电子发票已在线核销通过。',
            createdAt: '2 分钟前',
            parentId: 'c1',
            reactions: { '✅': 1 },
          },
        ],
      },
    ],
    title,
    class: className = '',
    onAddComment,
    onToggleReaction,
    onToggleResolved,
    onDeleteComment,
  }: ThreadedCommentDrawerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let newCommentText = $state('');
  let replyingToId = $state<string | null>(null);

  function handleSend() {
    const text = newCommentText.trim();
    if (!text) return;
    onAddComment?.(text, replyingToId ?? undefined);
    newCommentText = '';
    replyingToId = null;
  }

  const resolvedTitle = $derived(
    title ?? (chinese ? '记录协同讨论与批注流' : 'Threaded Comments & Annotations'),
  );
</script>

<Sheet.Root bind:open side="right">
  <Sheet.Content class={cn('w-full sm:max-w-md p-0 flex flex-col', className)}>
    <!-- Header -->
    <div class="px-6 py-5 border-b border-border/70 bg-card">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 text-primary">
          <MessageSquare class="h-5 w-5" />
          <Sheet.Title class="text-base font-semibold text-foreground">
            {resolvedTitle}
          </Sheet.Title>
        </div>
      </div>
      {#if recordTitle || recordId}
        <Sheet.Description class="text-xs text-muted-foreground mt-1 truncate">
          {recordTitle ?? `Record #${recordId}`}
        </Sheet.Description>
      {/if}
    </div>

    <!-- Comments Stream List -->
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {#each comments as comment (comment.id)}
        <div class="rounded-xl border border-border/70 bg-card p-3.5 space-y-2 text-xs shadow-2xs">
          <!-- Comment Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {comment.author.slice(0, 1)}
              </span>
              <span class="font-semibold text-foreground">{comment.author}</span>
              <span class="text-[10px] text-muted-foreground font-mono">{comment.createdAt}</span>
            </div>

            <div class="flex items-center gap-1">
              {#if comment.isResolved}
                <span class="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  <CheckCircle2 class="h-3 w-3" />
                  {chinese ? '已解决' : 'Resolved'}
                </span>
              {:else if onToggleResolved}
                <button
                  type="button"
                  onclick={() => onToggleResolved?.(comment.id, true)}
                  class="rounded p-1 text-muted-foreground hover:text-success hover:bg-success/10"
                  title={chinese ? '标记为已解决' : 'Mark resolved'}
                >
                  <CheckCircle2 class="h-3.5 w-3.5" />
                </button>
              {/if}

              {#if onDeleteComment}
                <button
                  type="button"
                  onclick={() => onDeleteComment?.(comment.id)}
                  class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              {/if}
            </div>
          </div>

          <!-- Comment Content Body -->
          <p class="text-foreground leading-relaxed pl-8">
            {comment.content}
          </p>

          <!-- Reactions & Reply Footer -->
          <div class="flex items-center justify-between pl-8 pt-1 text-[11px]">
            <div class="flex items-center gap-1.5">
              {#if comment.reactions}
                {#each Object.entries(comment.reactions) as [emoji, count] (emoji)}
                  <button
                    type="button"
                    onclick={() => onToggleReaction?.(comment.id, emoji)}
                    class="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs hover:border-primary transition-colors"
                  >
                    <span>{emoji}</span>
                    <span class="font-mono text-[10px] text-muted-foreground">{count}</span>
                  </button>
                {/each}
              {/if}

              {#if onToggleReaction}
                <button
                  type="button"
                  onclick={() => onToggleReaction?.(comment.id, '👍')}
                  class="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <Smile class="h-3 w-3" />
                </button>
              {/if}
            </div>

            <button
              type="button"
              onclick={() => (replyingToId = comment.id)}
              class="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply class="h-3 w-3" />
              <span>{chinese ? '回复' : 'Reply'}</span>
            </button>
          </div>

          <!-- Nested Replies Block -->
          {#if comment.replies && comment.replies.length > 0}
            <div class="mt-2.5 ml-6 pl-3 border-l-2 border-primary/30 space-y-2">
              {#each comment.replies as reply (reply.id)}
                <div class="rounded-lg bg-muted/30 p-2 text-xs space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-foreground text-[11px]">{reply.author}</span>
                    <span class="text-[10px] text-muted-foreground font-mono">{reply.createdAt}</span>
                  </div>
                  <p class="text-foreground leading-relaxed">{reply.content}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Reply Input Box -->
    <div class="p-4 border-t border-border/70 bg-card space-y-2">
      {#if replyingToId}
        <div class="flex items-center justify-between bg-primary/10 px-2.5 py-1 rounded text-[11px] text-primary">
          <span>{chinese ? `回复评论 #${replyingToId}` : `Replying to comment #${replyingToId}`}</span>
          <button type="button" onclick={() => (replyingToId = null)} class="hover:underline">
            {chinese ? '取消回复' : 'Cancel'}
          </button>
        </div>
      {/if}

      <div class="relative flex items-end gap-2">
        <textarea
          bind:value={newCommentText}
          placeholder={chinese ? '发表业务批注或 @成员协同讨论...' : 'Leave a comment...'}
          rows="2"
          class="flex-1 rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        ></textarea>

        <Button
          type="button"
          size="sm"
          onclick={handleSend}
          disabled={!newCommentText.trim()}
          class="h-9 px-3 gap-1"
        >
          <Send class="h-3.5 w-3.5" />
          <span>{chinese ? '发送' : 'Send'}</span>
        </Button>
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
