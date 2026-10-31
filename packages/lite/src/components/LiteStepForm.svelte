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
    /** Caller class merged with the built-in class list. */
    class?: string;
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
    class: className = '',
  }: Props = $props();
</script>

<div class="lite-step-form-card {className}">
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
    border: 1px solid #E5E6EB;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  .lite-step-header {
    display: flex;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #E5E6EB;
    margin-bottom: 16px;
    overflow-x: auto;
  }
  .lite-step-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #4E5969;
  }
  .lite-step-item.lite-step-current {
    color: #165DFF;
    font-weight: bold;
  }
  .lite-step-item.lite-step-completed {
    color: #00B42A;
  }
  .lite-step-circle {
    display: inline-block;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border-radius: 50%;
    background: #F2F3F5;
    margin-right: 6px;
    font-size: 11px;
  }
  .lite-step-current .lite-step-circle {
    background: #165DFF;
    color: #ffffff;
  }
  .lite-step-completed .lite-step-circle {
    background: #00B42A;
    color: #ffffff;
  }
  .lite-step-arrow {
    margin: 0 10px;
    color: #E5E6EB;
  }
  .lite-step-content {
    min-height: 100px;
    margin-bottom: 16px;
  }
  .lite-step-actions {
    display: flex;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #E5E6EB;
  }
</style>
