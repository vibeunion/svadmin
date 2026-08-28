import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import StepForm from './StepForm.svelte';

describe('StepForm Component', () => {
  it('renders steps with current active step', () => {
    const steps = [
      { title: 'Profile Setup' },
      { title: 'Billing Info' },
      { title: 'Review & Submit' },
    ];

    const view = render(StepForm, {
      steps,
      currentStep: 0,
    });

    expect(view.container.textContent).toContain('Profile Setup');
    expect(view.container.textContent).toContain('Billing Info');
    expect(view.container.textContent).toContain('Next Step');
  });
});
