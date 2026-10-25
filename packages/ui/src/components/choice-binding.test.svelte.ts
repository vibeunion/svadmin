import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ChoiceBindingHost from './choice-binding.test-host.svelte';

type Mode = 'table' | 'board' | 'disabled';
type ChangeHandler = (kind: 'radio' | 'segment', value: Mode) => void;

describe('radio and segmented control public bindings', () => {
  it('propagates user selection and serializes the radio choice once', async () => {
    const onchange = vi.fn<ChangeHandler>();
    const view = render(ChoiceBindingHost, { onchange });
    const form = view.getByRole('form');
    if (!(form instanceof HTMLFormElement)) throw new Error('Expected choice form');
    const radioView = within(view.getByRole('group', { name: 'View' }));

    expect(screen.getByTestId('radio-value').textContent).toBe('null');
    expect(screen.getByTestId('segment-value').textContent).toBe('undefined');
    expect(new FormData(form).getAll('view')).toEqual([]);

    await fireEvent.click(radioView.getByRole('radio', { name: 'Table' }));
    expect(screen.getByTestId('radio-value').textContent).toBe('table');
    expect(new FormData(form).getAll('view')).toEqual(['table']);
    expect(onchange).toHaveBeenLastCalledWith('radio', 'table');

    await fireEvent.click(radioView.getByRole('radio', { name: 'Board' }));
    await fireEvent.click(radioView.getByRole('radio', { name: 'Board' }));
    expect(screen.getByTestId('radio-value').textContent).toBe('board');
    expect(new FormData(form).getAll('view')).toEqual(['board']);
    expect(onchange).toHaveBeenCalledTimes(2);

    await fireEvent.click(radioView.getByRole('radio', { name: 'Disabled' }));
    expect(onchange).toHaveBeenCalledTimes(2);
    expect(new FormData(form).getAll('view')).toEqual(['board']);

    await fireEvent.click(radioView.getByRole('radio', { name: 'Table' }));
    expect(radioView.getByRole('radio', { name: 'Table' })).toHaveProperty('checked', true);
    expect(radioView.getByRole('radio', { name: 'Board' })).toHaveProperty('checked', false);
    expect(screen.getByTestId('radio-value').textContent).toBe('table');
    expect(onchange.mock.calls).toEqual([
      ['radio', 'table'],
      ['radio', 'board'],
      ['radio', 'table'],
    ]);
  });

  it('supports segmented keyboard navigation and parent assignment without duplicate callbacks', async () => {
    const onchange = vi.fn<ChangeHandler>();
    render(ChoiceBindingHost, { onchange });
    const segmentGroup = screen.getByRole('radiogroup', { name: 'Display mode' });
    const segmentView = within(segmentGroup);
    const radioView = within(screen.getByRole('group', { name: 'View' }));
    const tableSegment = segmentView.getByRole('radio', { name: 'Table' });

    expect(tableSegment.getAttribute('tabindex')).toBe('0');
    await fireEvent.keyDown(tableSegment, { key: 'ArrowRight' });
    expect(screen.getByTestId('segment-value').textContent).toBe('board');
    expect(onchange).toHaveBeenLastCalledWith('segment', 'board');
    expect(document.activeElement).toBe(segmentView.getByRole('radio', { name: 'Board' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Set parent values' }));
    expect(screen.getByTestId('radio-value').textContent).toBe('board');
    expect(screen.getByTestId('segment-value').textContent).toBe('table');
    expect(radioView.getByRole('radio', { name: 'Board' })).toHaveProperty('checked', true);
    expect(radioView.getByRole('radio', { name: 'Table' })).toHaveProperty('checked', false);
    expect(segmentView.getByRole('radio', { name: 'Table' }).getAttribute('aria-checked')).toBe('true');
    expect(onchange).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Clear parent values' }));
    expect(screen.getByTestId('radio-value').textContent).toBe('null');
    expect(screen.getByTestId('segment-value').textContent).toBe('undefined');
    expect(radioView.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(segmentView.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(tableSegment.getAttribute('tabindex')).toBe('0');
    expect(onchange).toHaveBeenCalledTimes(1);
  });
});
