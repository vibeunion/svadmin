<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface LiteFormStep {
    title: string;
    description?: string;
  }

  interface Props {
    steps: LiteFormStep[];
    currentStep?: number;
    action?: string;
    method?: "get" | "post" | "dialog" | "GET" | "POST" | "DIALOG" | null;
    submitText?: string;
    nextText?: string;
    prevText?: string;
    children?: Snippet;
  }

  let {
    steps,
    currentStep = 0,
    action = '',
    method = 'POST',
    submitText = 'Submit',
    nextText = 'Next Step',
    prevText = 'Previous Step',
    children,
  }: Props = $props();
</script>

<div class="lite-step-form-card">
  <!-- Step Indicators -->
  <div class="lite-step-header">
    {#each steps as step, index (index)}
      {@const isCompleted = index < currentStep}
      {@const isCurrent = index === currentStep}
      <div class="lite-step-item {isCurrent ? 'lite-step-current' : isCompleted ? 'lite-step-completed' : ''}">
        <span class="lite-step-circle">
          {#if isCompleted}✔{:else}{index + 1}{/if}
        </span>
        <span class="lite-step-title">{step.title}</span>
      </div>
      {#if index < steps.length - 1}
        <span class="lite-step-arrow">→</span>
      {/if}
    {/each}
  </div>

  <!-- Form Body -->
  <form {action} {method} class="lite-step-body">
    <input type="hidden" name="_step" value={currentStep} />

    <div class="lite-step-content">
      {#if children}
        {@render children()}
      {/if}
    </div>

    <!-- Actions -->
    <div class="lite-step-actions">
      {#if currentStep > 0}
        <button type="submit" name="_step_action" value="prev" class="lite-btn lite-btn-outline lite-btn-sm">
          ← {prevText}
        </button>
      {/if}
      <div class="lite-step-right-action" style="margin-left: auto;">
        {#if currentStep < steps.length - 1}
          <button type="submit" name="_step_action" value="next" class="lite-btn lite-btn-primary lite-btn-sm">
            {nextText} →
          </button>
        {:else}
          <button type="submit" name="_step_action" value="finish" class="lite-btn lite-btn-primary lite-btn-sm">
            {submitText}
          </button>
        {/if}
      </div>
    </div>
  </form>
</div>

<style>
  .lite-step-form-card {
    padding: 16px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  .lite-step-header {
    display: flex;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 16px;
    overflow-x: auto;
  }
  .lite-step-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #64748b;
  }
  .lite-step-item.lite-step-current {
    color: #3b82f6;
    font-weight: bold;
  }
  .lite-step-item.lite-step-completed {
    color: #10b981;
  }
  .lite-step-circle {
    display: inline-block;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border-radius: 50%;
    background: #f1f5f9;
    margin-right: 6px;
    font-size: 11px;
  }
  .lite-step-current .lite-step-circle {
    background: #3b82f6;
    color: #ffffff;
  }
  .lite-step-completed .lite-step-circle {
    background: #10b981;
    color: #ffffff;
  }
  .lite-step-arrow {
    margin: 0 10px;
    color: #cbd5e1;
  }
  .lite-step-content {
    min-height: 100px;
    margin-bottom: 16px;
  }
  .lite-step-actions {
    display: flex;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
</style>
