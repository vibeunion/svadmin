<script lang="ts">
  interface LiteActivityItem {
    id: string;
    user?: { name: string };
    action: string;
    target?: string;
    timestamp: string;
    comment?: string;
    status?: 'info' | 'success' | 'warning' | 'destructive';
  }

  interface Props {
    activities?: LiteActivityItem[];
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
  }

  let {
    activities = [],
    action = '',
    method = 'POST',
  }: Props = $props();
</script>

<div class="lite-activity-card">
  <div class="lite-activity-header">
    <strong>Activity & Timeline Stream</strong>
  </div>

  <ul class="lite-activity-list">
    {#each activities as act (act.id)}
      <li class="lite-activity-item">
        <div class="lite-activity-title">
          <strong>{act.user?.name ?? 'System'}</strong> {act.action}
          {#if act.target}<strong>{act.target}</strong>{/if}
          <span class="lite-activity-time">{act.timestamp}</span>
        </div>
        {#if act.comment}
          <div class="lite-activity-comment">
            {act.comment}
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <!-- Comment Form -->
  <form {action} {method} class="lite-activity-form">
    <div style="margin-bottom: 8px;">
      <label for="lite_act_comment" class="lite-label">Add Note / Comment:</label>
      <textarea id="lite_act_comment" name="comment" class="lite-textarea" style="height: 50px;" placeholder="Write a comment..."></textarea>
    </div>
    <div style="text-align: right;">
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm">
        Post Comment
      </button>
    </div>
  </form>
</div>

<style>
  .lite-activity-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .lite-activity-header {
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .lite-activity-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px 0;
  }
  .lite-activity-item {
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 12px;
  }
  .lite-activity-time {
    color: #94a3b8;
    margin-left: 8px;
    font-size: 11px;
  }
  .lite-activity-comment {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
    border-radius: 4px;
    margin-top: 4px;
    color: #475569;
  }
</style>
