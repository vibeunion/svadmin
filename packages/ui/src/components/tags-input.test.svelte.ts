import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TagsInput from './TagsInput.svelte';

afterEach(() => cleanup());

describe('TagsInput', () => {
  it('adds unique tags, serializes them as repeated form fields, and removes with Backspace', async () => {
    const onchange = vi.fn();
    const view = render(TagsInput, {
      value: ['existing'],
      name: 'labels',
      ariaLabel: 'Labels',
      onchange,
    });
    const input = view.getByRole('textbox', { name: 'Labels' });
    await fireEvent.input(input, { target: { value: 'alpha,beta,alpha' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onchange).toHaveBeenLastCalledWith(['existing', 'alpha', 'beta']);
    expect([...view.container.querySelectorAll('input[type="hidden"]')].map(node => (node as HTMLInputElement).value))
      .toEqual(['existing', 'alpha', 'beta']);
    await fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onchange).toHaveBeenLastCalledWith(['existing', 'alpha']);
  });

  it('respects maxItems and disabled state', async () => {
    const onchange = vi.fn();
    const view = render(TagsInput, {
      value: ['one'],
      maxItems: 2,
      disabled: true,
      onchange,
    });
    expect((view.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);
    expect(view.getAllByRole('button', { name: /Remove/ })[0]).toHaveProperty('disabled', true);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not require a draft when required tags already exist', () => {
    const view = render(TagsInput, {
      value: ['existing'],
      required: true,
      ariaLabel: 'Labels',
    });
    expect((view.getByRole('textbox', { name: 'Labels' }) as HTMLInputElement).required).toBe(false);
  });
});
