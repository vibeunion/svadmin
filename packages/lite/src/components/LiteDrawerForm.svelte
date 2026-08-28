<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    action?: string;
    method?: "get" | "post" | "dialog" | "GET" | "POST" | "DIALOG" | null;
    submitText?: string;
    cancelText?: string;
    children?: Snippet;
  }

  let {
    title,
    description,
    action = '',
    method = 'POST',
    submitText = 'Save',
    cancelText = 'Cancel',
    children,
  }: Props = $props();
</script>

<div class="lite-drawer-card">
  <div class="lite-drawer-header">
    <h3 class="lite-drawer-title">{title}</h3>
    {#if description}
      <p class="lite-drawer-desc">{description}</p>
    {/if}
  </div>

  <form {action} {method} class="lite-drawer-form">
    <div class="lite-drawer-body">
      {#if children}
        {@render children()}
      {/if}
    </div>

    <div class="lite-drawer-footer">
      <button type="button" class="lite-btn lite-btn-outline lite-btn-sm" onclick={() => history.back()}>
        {cancelText}
      </button>
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm" style="margin-left: 8px;">
        {submitText}
      </button>
    </div>
  </form>
</div>

<style>
  .lite-drawer-card {
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .lite-drawer-header {
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 12px;
  }
  .lite-drawer-title {
    margin: 0;
    font-size: 14px;
    color: #1e293b;
  }
  .lite-drawer-desc {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #64748b;
  }
  .lite-drawer-body {
    margin-bottom: 16px;
    font-size: 13px;
  }
  .lite-drawer-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
</style>
