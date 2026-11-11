import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import StepWizard, { type StepWizardItem } from './StepWizard.svelte';
import WorkflowStepper, { type WorkflowStepItem } from './WorkflowStepper.svelte';

describe('StepWizard and WorkflowStepper suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders StepWizard and navigates with Next/Prev', async () => {
    const steps: StepWizardItem[] = [
      { id: 'step-1', title: 'Basic Info', description: 'Enter tenant name' },
      { id: 'step-2', title: 'Configure Database', description: 'Set cluster topology' },
      { id: 'step-3', title: 'Review & Launch', description: 'Review summary' },
    ];

    const view = render(StepWizard, {
      steps,
      currentStep: 0,
    });

    expect(view.container.textContent).toContain('Basic Info');
    expect(view.container.textContent).toContain('Step 1 of 3');

    const nextBtn = view.container.querySelector('button.min-w-24');
    expect(nextBtn).toBeTruthy();
    if (nextBtn) {
      await fireEvent.click(nextBtn);
      expect(view.container.textContent).toContain('Step 2 of 3');
    }
  });

  it('blocks step navigation when beforeNext async guard fails', async () => {
    const beforeNext = vi.fn().mockImplementation((idx: number) => {
      if (idx === 0) return false;
      return true;
    });

    const steps: StepWizardItem[] = [
      { id: 'step-1', title: 'Account Verification' },
      { id: 'step-2', title: 'Payment Setup' },
    ];

    const view = render(StepWizard, {
      steps,
      currentStep: 0,
      beforeNext,
    });

    const nextBtn = view.container.querySelector('button.min-w-24');
    expect(nextBtn).toBeTruthy();
    if (nextBtn) {
      await fireEvent.click(nextBtn);
      expect(beforeNext).toHaveBeenCalled();
      expect(view.container.textContent).toContain('Step 1 of 2');
      expect(view.container.textContent).toContain('Account Verification');
    }
  });

  it('supports dynamic branching based on step condition', async () => {
    const steps: StepWizardItem[] = [
      { id: 's1', title: 'Account Type' },
      {
        id: 's2-enterprise',
        title: 'Enterprise VAT Info',
        condition: (draft) => draft['type'] === 'enterprise',
      },
      { id: 's3', title: 'Confirmation' },
    ];

    const view = render(StepWizard, {
      steps,
      draft: { type: 'personal' },
    });

    expect(view.container.textContent).toContain('Step 1 of 2');
    expect(view.container.textContent).not.toContain('Enterprise VAT Info');
  });

  it('auto-saves draft to localStorage and restores on mount', () => {
    localStorage.setItem(
      'test-wizard-draft',
      JSON.stringify({
        currentStep: 1,
        draft: { orgName: 'Acme Corp', tier: 'premium' },
      }),
    );

    const onDraftRestore = vi.fn();
    const steps: StepWizardItem[] = [
      { id: 's1', title: 'Step 1' },
      { id: 's2', title: 'Step 2' },
    ];

    const view = render(StepWizard, {
      steps,
      storageKey: 'test-wizard-draft',
      onDraftRestore,
    });

    expect(onDraftRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStep: 1,
        draft: expect.objectContaining({ orgName: 'Acme Corp' }),
      }),
    );
    expect(view.container.textContent).toContain('Step 2 of 2');
  });

  it('renders WorkflowStepper with task progress and executes retry', async () => {
    const onRetry = vi.fn();
    const onSelect = vi.fn();

    const stages: WorkflowStepItem[] = [
      { id: 'init', label: 'Provision VPC', status: 'completed', durationMs: 450 },
      { id: 'dns', label: 'Assign Anycast IP', status: 'failed', errorMessage: 'Quota exceeded', retryable: true },
      { id: 'deploy', label: 'Deploy Container', status: 'pending' },
    ];

    const view = render(WorkflowStepper, {
      steps: stages,
      title: 'Cluster Rollout Pipeline',
      onRetry,
      onSelect,
    });

    expect(view.container.textContent).toContain('Cluster Rollout Pipeline');
    expect(view.container.textContent).toContain('Provision VPC');
    expect(view.container.textContent).toContain('450ms');
    expect(view.container.textContent).toContain('Quota exceeded');

    const retryBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Retry') || b.textContent?.includes('重试'),
    );
    expect(retryBtn).toBeTruthy();
    if (retryBtn) {
      await fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ id: 'dns' }));
    }
  });
});
