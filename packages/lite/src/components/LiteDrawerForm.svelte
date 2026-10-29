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
    background: #F7F8FA;
    border: 1px solid #E5E6EB;
    border-left: 4px solid #165DFF;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .lite-drawer-header {
    padding-bottom: 10px;
    border-bottom: 1px solid #E5E6EB;
    margin-bottom: 12px;
  }
  .lite-drawer-title {
    margin: 0;
    font-size: 14px;
    color: #1D2129;
  }
  .lite-drawer-desc {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #4E5969;
  }
  .lite-drawer-body {
    margin-bottom: 16px;
    font-size: 13px;
  }
  .lite-drawer-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #E5E6EB;
  }
</style>
