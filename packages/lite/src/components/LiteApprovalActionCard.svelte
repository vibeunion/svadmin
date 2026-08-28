<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'recalled';
    action?: string;
    children?: Snippet;
  }

  let {
    title = 'Approval Request',
    status = 'pending',
    action = '',
    children,
  }: Props = $props();
</script>

<div class="lite-approval-card lite-form-group">
  <div class="lite-approval-header">
    <strong>{title}</strong>
    <span class="lite-badge lite-badge-{status}">{status.toUpperCase()}</span>
  </div>

  {#if children}
    <div class="lite-approval-body">
      {@render children()}
    </div>
  {/if}

  {#if status === 'pending'}
    <form {action} method="POST" class="lite-approval-form">
      <div class="lite-approval-field">
        <label for="approval_comment" class="lite-label">Approval / Rejection Comment:</label>
        <textarea id="approval_comment" name="comment" class="lite-textarea" style="height: 60px;" placeholder="Optional comment or rejection reason..."></textarea>
      </div>
      <div class="lite-approval-actions">
        <button type="submit" name="_action" value="approve" class="lite-btn lite-btn-sm lite-btn-success">
          ✔ Approve
        </button>
        <button type="submit" name="_action" value="reject" class="lite-btn lite-btn-sm lite-btn-danger" style="margin-left: 8px;">
          ✕ Reject
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .lite-approval-card {
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  .lite-approval-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .lite-approval-body {
    font-size: 12px;
    color: #475569;
    margin-bottom: 12px;
  }
  .lite-approval-field {
    margin-bottom: 8px;
  }
  .lite-approval-actions {
    display: flex;
  }
</style>
