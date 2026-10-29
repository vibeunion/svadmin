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
    submitText = 'Confirm',
    cancelText = 'Cancel',
    children,
  }: Props = $props();
</script>

<div class="lite-modal-card">
  <div class="lite-modal-header">
    <h3 class="lite-modal-title">{title}</h3>
    {#if description}
      <p class="lite-modal-desc">{description}</p>
    {/if}
  </div>

  <form {action} {method} class="lite-modal-form">
    <div class="lite-modal-body">
      {#if children}
        {@render children()}
      {/if}
    </div>

    <div class="lite-modal-footer">
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
  .lite-modal-card {
    padding: 16px;
    background: #ffffff;
    border: 1px solid #E5E6EB;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  .lite-modal-header {
    padding-bottom: 10px;
    border-bottom: 1px solid #E5E6EB;
    margin-bottom: 12px;
  }
  .lite-modal-title {
    margin: 0;
    font-size: 14px;
    color: #1D2129;
  }
  .lite-modal-desc {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #4E5969;
  }
  .lite-modal-body {
    margin-bottom: 16px;
    font-size: 13px;
  }
  .lite-modal-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #E5E6EB;
  }
</style>
