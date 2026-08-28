import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SensitiveDataMask from './SensitiveDataMask.svelte';

describe('SensitiveDataMask Component', () => {
  it('masks phone number by default', () => {
    const view = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'phone',
    });
    expect(view.container.textContent).toContain('138****5678');
  });

  it('masks ID card correctly', () => {
    const view = render(SensitiveDataMask, {
      value: '110101199001011234',
      type: 'id-card',
    });
    expect(view.container.textContent).toContain('110101********1234');
  });

  it('masks email correctly', () => {
    const view = render(SensitiveDataMask, {
      value: 'alex.smith@example.com',
      type: 'email',
    });
    expect(view.container.textContent).toContain('a***h@example.com');
  });

  it('unmasks value when eye button is clicked', async () => {
    const view = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'phone',
      allowUnmask: true,
    });
    expect(view.container.textContent).toContain('138****5678');

    const toggleBtn = view.container.querySelector('button[aria-label="Reveal sensitive data"]');
    if (toggleBtn) {
      await fireEvent.click(toggleBtn);
      expect(view.container.textContent).toContain('13812345678');
    }
  });
});
