import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RadioGroup from './RadioGroup.svelte';

afterEach(() => {
  cleanup();
});

describe('RadioGroup', () => {
  const options = [
    { value: 'personal', label: 'Personal', description: 'Only you can access it.' },
    { value: 'team', label: 'Team', disabled: true },
    { value: 'company', label: 'Company' },
  ] as const;

  it('exposes fieldset semantics and emits only enabled changes', async () => {
    const onchange = vi.fn();
    const view = render(RadioGroup, {
      options,
      value: 'personal',
      legend: 'Visibility',
      name: 'visibility',
      describedby: 'visibility-help',
      onchange,
    });

    expect(view.getByRole('group', { name: 'Visibility' })).toBeTruthy();
    expect((view.getByRole('radio', { name: /Personal/ }) as HTMLInputElement).checked).toBe(true);
    expect((view.getByRole('radio', { name: /Team/ }) as HTMLInputElement).disabled).toBe(true);
    await fireEvent.click(view.getByRole('radio', { name: 'Company' }));
    expect(onchange).toHaveBeenCalledWith('company');
  });

  it('keeps the whole group disabled and preserves invalid state', () => {
    const view = render(RadioGroup, {
      options,
      disabled: true,
      invalid: true,
      ariaLabel: 'Visibility',
    });

    const group = view.getByRole('group', { name: 'Visibility' });
    expect(group.getAttribute('data-invalid')).toBe('true');
    expect(view.getAllByRole('radio').every(input => (input as HTMLInputElement).disabled)).toBe(true);
  });
});
