<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface LiteStepItem {
    id: string;
    title: string;
    description?: string;
  }

  interface Props {
    steps: LiteStepItem[];
    currentStep?: number;
    action?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    steps = [],
    currentStep = 0,
    action,
    class: className = '',
    children,
  }: Props = $props();
</script>

<div
  class="lite-step-wizard {className}"
  data-svadmin-component="LiteStepWizard"
  data-current-step={currentStep}
>
  <nav class="lite-steps-nav" aria-label="Wizard Steps">
    <ol class="lite-steps-list">
      {#each steps as step, idx (step.id)}
        {@const isDone = idx < currentStep}
        {@const isCurrent = idx === currentStep}
        <li
          class="lite-step-item"
          class:lite-step-done={isDone}
          class:lite-step-active={isCurrent}
        >
          <span class="lite-step-badge">
            {#if isDone}✓{:else}{idx + 1}{/if}
          </span>
          <span class="lite-step-info">
            <span class="lite-step-title">{step.title}</span>
            {#if step.description}
              <span class="lite-step-desc">{step.description}</span>
            {/if}
          </span>
          {#if idx < steps.length - 1}
            <span class="lite-step-divider" aria-hidden="true"></span>
          {/if}
        </li>
      {/each}
    </ol>
  </nav>

  <div class="lite-step-body">
    {#if children}{@render children()}{/if}
  </div>

  {#if action}
    <form {action} method="POST" class="lite-step-actions">
      <input type="hidden" name="currentStep" value={currentStep} />
      {#if currentStep > 0}
        <button type="submit" name="direction" value="prev" class="lite-btn-secondary">上一步</button>
      {/if}
      <button type="submit" name="direction" value="next" class="lite-btn-primary">
        {currentStep >= steps.length - 1 ? '提交完成' : '下一步'}
      </button>
    </form>
  {/if}
</div>

<style>
  .lite-step-wizard { border: 1px solid #e5e6eb; border-radius: 8px; background: #ffffff; padding: 20px; }
  .lite-steps-nav { margin-bottom: 24px; border-bottom: 1px solid #f2f3f5; padding-bottom: 16px; }
  .lite-steps-list { display: flex; align-items: center; list-style: none; margin: 0; padding: 0; }
  .lite-step-item { display: flex; align-items: center; flex: 1; }
  .lite-step-item > * + * { margin-left: 8px; }
  .lite-step-badge {
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 12px; font-weight: 700; background: #f2f3f5; color: #4e5969;
  }
  .lite-step-done .lite-step-badge { background: #00b42a; color: #fff; }
  .lite-step-active .lite-step-badge { background: #165dff; color: #fff; }
  .lite-step-info { display: flex; flex-direction: column; }
  .lite-step-title { font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-step-desc { font-size: 11px; color: #86909c; }
  .lite-step-divider { flex: 1; height: 1px; background: #e5e6eb; margin: 0 12px; }
  .lite-step-done .lite-step-divider { background: #00b42a; }
  .lite-step-body { min-height: 120px; }
  .lite-step-actions { display: flex; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #f2f3f5; padding-top: 16px; }
  .lite-step-actions > * + * { margin-left: 12px; }
  .lite-btn-primary { padding: 6px 16px; background: #165dff; color: #fff; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; }
  .lite-btn-secondary { padding: 6px 16px; background: #f2f3f5; color: #4e5969; border: 1px solid #e5e6eb; border-radius: 4px; font-size: 12px; cursor: pointer; }
</style>
