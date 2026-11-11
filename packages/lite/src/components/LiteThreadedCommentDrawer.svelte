<script lang="ts">
  export interface LiteComment {
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }

  interface Props {
    comments?: LiteComment[];
    title?: string;
    action?: string;
    class?: string;
  }

  let {
    comments = [],
    title = 'Comments',
    action = '/comments/create',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-comment-box {className}"
  data-svadmin-component="LiteThreadedCommentDrawer"
>
  <h4 class="lite-comment-title">{title}</h4>
  <ul class="lite-comment-list">
    {#each comments as c (c.id)}
      <li class="lite-comment-item">
        <div class="lite-comment-head">
          <span class="lite-comment-author">{c.author}</span>
          <span class="lite-comment-time">{c.createdAt}</span>
        </div>
        <p class="lite-comment-content">{c.content}</p>
      </li>
    {/each}
  </ul>

  <form {action} method="POST" class="lite-comment-form">
    <textarea name="content" required placeholder="Leave a reply..." class="lite-comment-input"></textarea>
    <button type="submit" class="lite-comment-btn">Submit Reply</button>
  </form>
</div>

<style>
  .lite-comment-box { border: 1px solid #e5e6eb; border-radius: 8px; background: #ffffff; padding: 16px; font-size: 12px; }
  .lite-comment-title { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: #1d2129; }
  .lite-comment-list { list-style: none; margin: 0 0 16px 0; padding: 0; }
  .lite-comment-item { border-bottom: 1px solid #f2f3f5; padding: 8px 0; }
  .lite-comment-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .lite-comment-author { font-weight: 600; color: #1d2129; }
  .lite-comment-time { color: #86909c; font-size: 11px; }
  .lite-comment-content { margin: 0; color: #4e5969; }
  .lite-comment-form { display: flex; flex-direction: column; }
  .lite-comment-form > * + * { margin-top: 8px; }
  .lite-comment-input { height: 60px; border: 1px solid #e5e6eb; border-radius: 4px; padding: 6px 10px; font-size: 12px; }
  .lite-comment-btn { height: 32px; background: #165dff; color: #fff; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }
</style>
