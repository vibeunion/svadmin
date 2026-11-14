import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Textarea from './textarea.svelte';

describe('textarea input states', () => {
  it('marks the same eight states as Input', async () => {
    const view = render(Textarea, { 'aria-label': 'Notes', value: '' });
    const read = () => screen.getByLabelText<HTMLTextAreaElement>('Notes');
    expect(read().getAttribute('data-input-state')).toBe('default');

    await view.rerender({ 'aria-label': 'Notes', value: 'Ada' });
    expect(read().getAttribute('data-input-state')).toBe('complete');

    await view.rerender({ 'aria-label': 'Notes', value: 'Ada', status: 'success' });
    expect(read().getAttribute('data-input-state')).toBe('success');

    await view.rerender({ 'aria-label': 'Notes', value: 'Ada', status: 'loading' });
    expect(read().getAttribute('data-input-state')).toBe('loading');
    expect(read().getAttribute('aria-busy')).toBe('true');

    await view.rerender({ 'aria-label': 'Notes', value: 'Ada', status: 'error' });
    expect(read().getAttribute('data-input-state')).toBe('error');

    await view.rerender({ 'aria-label': 'Notes', value: 'Ada', status: undefined, disabled: true });
    expect(read().getAttribute('data-input-state')).toBe('disabled');

    await view.rerender({ 'aria-label': 'Notes', value: '', disabled: false });
    await fireEvent.focus(read());
    expect(read().getAttribute('data-input-state')).toBe('focus');
    read().setSelectionRange(0, 0);
    await fireEvent.select(read());
    expect(read().getAttribute('data-input-state')).toBe('focus');
  });
});
