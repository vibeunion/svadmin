<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Avatar } from './ui/avatar/index.js';
  import { Button } from './ui/button/index.js';
  import { Textarea } from './ui/textarea/index.js';
  import { cn } from '../utils.js';

  export interface CommentItem {
    id: string;
    author: string;
    content: string;
    time?: string | Date;
    avatar?: string;
    actions?: Snippet;
    replies?: CommentItem[];
  }

  interface Props {
    comments: CommentItem[];
    placeholder?: string;
    submitText?: string;
    emptyText?: string;
    submitting?: boolean;
    class?: string;
    onsubmit?: (content: string) => void | Promise<void>;
  }

  let {
    comments,
    placeholder = 'Write a comment…',
    submitText = 'Comment',
    emptyText = 'No comments yet',
    submitting = false,
    class: className = '',
    onsubmit,
  }: Props = $props();

  let draft = $state('');

  function formatTime(value: string | Date | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  async function submit(): Promise<void> {
    const content = draft.trim();
    if (!content || submitting) return;
    await onsubmit?.(content);
    draft = '';
  }
</script>

<section class={cn('svadmin-comments', className)} aria-label="Comments">
  {#if comments.length === 0}
    <p class="svadmin-comments__empty">{emptyText}</p>
  {:else}
    <ol class="svadmin-comments__list">
      {#each comments as comment (comment.id)}
        <li class="svadmin-comments__item">
          <Avatar src={comment.avatar} alt={comment.author} fallback={comment.author.slice(0, 1)} />
          <div class="svadmin-comments__body">
            <header>
              <strong>{comment.author}</strong>
              {#if comment.time}<time datetime={comment.time instanceof Date ? comment.time.toISOString() : comment.time}>{formatTime(comment.time)}</time>{/if}
            </header>
            <p>{comment.content}</p>
            {#if comment.actions}<div class="svadmin-comments__actions">{@render comment.actions()}</div>{/if}
            {#if comment.replies?.length}
              <ol class="svadmin-comments__replies">
                {#each comment.replies as reply (reply.id)}
                  <li>
                    <strong>{reply.author}</strong>
                    <p>{reply.content}</p>
                  </li>
                {/each}
              </ol>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
  {#if onsubmit}
    <form class="svadmin-comments__form" onsubmit={(event) => { event.preventDefault(); void submit(); }}>
      <Textarea bind:value={draft} {placeholder} rows={3} aria-label={placeholder} disabled={submitting}></Textarea>
      <div>
        <Button type="submit" size="sm" disabled={submitting || !draft.trim()}>{submitting ? 'Sending…' : submitText}</Button>
      </div>
    </form>
  {/if}
</section>

<style>
  .svadmin-comments { display: grid; gap: var(--svadmin-space-4); min-width: 0; }
  .svadmin-comments__empty { margin: 0; padding: var(--svadmin-space-5); border: 1px dashed var(--border); border-radius: var(--radius-md); color: var(--muted-foreground); font-size: var(--svadmin-text-label); text-align: center; }
  .svadmin-comments__list, .svadmin-comments__replies { display: grid; gap: var(--svadmin-space-4); margin: 0; padding: 0; list-style: none; }
  .svadmin-comments__item { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--svadmin-space-3); }
  .svadmin-comments__body { display: grid; gap: var(--svadmin-space-1); min-width: 0; }
  .svadmin-comments__body header { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--svadmin-space-2); }
  .svadmin-comments__body strong { color: var(--foreground); font-size: var(--svadmin-text-label); font-weight: 600; }
  .svadmin-comments__body time { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-comments__body p { margin: 0; color: var(--foreground); font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); overflow-wrap: anywhere; }
  .svadmin-comments__actions { display: flex; gap: var(--svadmin-space-2); }
  .svadmin-comments__replies { margin-block-start: var(--svadmin-space-2); padding-inline-start: var(--svadmin-space-3); border-inline-start: 1px solid var(--border); }
  .svadmin-comments__replies li { display: grid; gap: 0.1rem; }
  .svadmin-comments__form { display: grid; gap: var(--svadmin-space-2); }
  .svadmin-comments__form > div { display: flex; justify-content: flex-end; }
</style>