<script lang="ts">
  interface CommentItem {
    id: string;
    author: string;
    content: string;
    time?: string;
    avatar?: string;
    replies?: CommentItem[];
  }

  interface Props {
    comments: CommentItem[];
    emptyText?: string;
    label?: string;
    action?: string;
    submitLabel?: string;
    name?: string;
  }

  let {
    comments,
    emptyText = 'No comments yet',
    label = 'Comments',
    action,
    submitLabel = 'Comment',
    name = 'comment',
  }: Props = $props();
</script>

<section class="lite-comments" aria-label={label}>
  {#if comments.length === 0}
    <p class="lite-muted">{emptyText}</p>
  {:else}
    <ol class="lite-comments__list">
      {#each comments as comment (comment.id)}
        <li class="lite-comments__item">
          {#if comment.avatar}<img src={comment.avatar} alt="" loading="lazy" />{:else}<span class="lite-comments__avatar" aria-hidden="true">{comment.author.slice(0, 1)}</span>{/if}
          <div class="lite-comments__body">
            <p class="lite-comments__meta"><strong>{comment.author}</strong>{#if comment.time}<time>{comment.time}</time>{/if}</p>
            <p>{comment.content}</p>
            {#if comment.replies?.length}
              <ol class="lite-comments__replies">
                {#each comment.replies as reply (reply.id)}
                  <li><strong>{reply.author}</strong> {reply.content}</li>
                {/each}
              </ol>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
  {#if action}
    <form class="lite-comments__form" method="POST" {action}>
      <label class="lite-form-group">
        <span>Add a comment</span>
        <textarea class="lite-input" name={name} rows="3" required></textarea>
      </label>
      <button class="lite-btn lite-btn-primary lite-btn-sm" type="submit">{submitLabel}</button>
    </form>
  {/if}
</section>

<style>
  .lite-comments { display: block; }
  .lite-comments__list, .lite-comments__replies { display: block; margin: 0; padding: 0; list-style: none; }
  .lite-comments__item { display: flex; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid #F2F3F5; }
  .lite-comments__avatar, .lite-comments__item > img { display: inline-grid; flex: 0 0 32px; place-items: center; width: 32px; height: 32px; border-radius: 999px; background: #E8F3FF; color: #165DFF; font-size: 13px; font-weight: 600; object-fit: cover; }
  .lite-comments__body { min-width: 0; flex: 1; }
  .lite-comments__body > p { margin: 4px 0 0; color: #4E5969; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
  .lite-comments__meta { display: flex; flex-wrap: wrap; align-items: baseline; margin: 0; color: #1D2129; font-size: 13px; }
  .lite-comments__meta time { color: #86909C; font-size: 12px; }
  .lite-comments__replies { margin-top: 8px; padding-left: 12px; border-left: 2px solid #F2F3F5; color: #4E5969; font-size: 12px; }
  .lite-comments__form { display: block; justify-items: start; }

  .lite-comments__item > img, .lite-comments__avatar { margin-right: 10px; }
  .lite-comments__meta > * + * { margin-left: 8px; }
  .lite-comments__form textarea { margin-bottom: 8px; }
</style>
