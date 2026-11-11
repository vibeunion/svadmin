<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    actionTitle: string;
    requiredRole?: string;
    formAction?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    actionTitle,
    requiredRole = '合规主管',
    formAction = '/approval/verify',
    class: className = '',
    children,
  }: Props = $props();
</script>

<div
  class="lite-dual-approval {className}"
  data-svadmin-component="LiteDualApprovalGate"
>
  <div class="lite-approval-header">
    <span class="lite-approval-badge">双人联签 (Two-Person Rule)</span>
    <h3 class="lite-approval-title">{actionTitle}</h3>
    <p class="lite-approval-desc">特权高危操作，须由第二位具备 [{requiredRole}] 权限的主管输入口令核验。</p>
  </div>

  {#if children}{@render children()}{/if}

  <form action={formAction} method="POST" class="lite-approval-form">
    <div class="lite-form-row">
      <label for="lite-rev-id" class="lite-label">复核人工号</label>
      <input id="lite-rev-id" name="reviewerId" type="text" required class="lite-input" placeholder="输入工号" />
    </div>
    <div class="lite-form-row">
      <label for="lite-rev-sec" class="lite-label">复核人口令/2FA</label>
      <input id="lite-rev-sec" name="secret" type="password" required class="lite-input" placeholder="输入独立核验口令" />
    </div>
    <button type="submit" class="lite-approval-btn">确认双人联签并执行</button>
  </form>
</div>

<style>
  .lite-dual-approval { border: 1px solid #fbbbb0; background: #fffdfc; border-radius: 8px; padding: 20px; }
  .lite-approval-badge { display: inline-block; font-size: 11px; font-weight: 600; color: #f53f3f; background: #ffece8; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
  .lite-approval-title { font-size: 16px; font-weight: 700; color: #1d2129; margin: 0 0 6px 0; }
  .lite-approval-desc { font-size: 12px; color: #86909c; margin: 0 0 16px 0; }
  .lite-approval-form { display: flex; flex-direction: column; }
  .lite-approval-form > * + * { margin-top: 12px; }
  .lite-form-row { display: flex; flex-direction: column; }
  .lite-form-row > * + * { margin-top: 4px; }
  .lite-label { font-size: 12px; font-weight: 600; color: #4e5969; }
  .lite-input { height: 32px; border: 1px solid #e5e6eb; border-radius: 4px; padding: 0 10px; font-size: 12px; }
  .lite-approval-btn { height: 34px; background: #f53f3f; color: #fff; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }
</style>
