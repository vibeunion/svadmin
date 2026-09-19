import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JsonSchemaForm from './JsonSchemaForm.svelte';
import DisabledHost from './json-schema-form-disabled.test-host.svelte';

const schema = { properties: {
  name: { type: 'string', title: 'Name', default: 'Original' },
  quota: { type: 'number', title: 'Quota', default: 10 },
  profile: { type: 'object', properties: { city: { type: 'string', title: 'City', default: 'Tokyo' } } },
  rows: { type: 'array', title: 'Rows', items: { type: 'object', required: ['active'], properties: { active: { type: 'boolean', title: 'Active' } } } },
} };
const form = (view: { container: HTMLElement }): HTMLFormElement => {
  const element = view.container.querySelector('form');
  if (!element) throw new Error('Missing form');
  return element;
};
afterEach(cleanup);

describe('nested schema form draft and submission ownership', () => {
  it('does not repopulate cleared defaults after editing a sibling or submitting', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, locale: 'en-US' });
    const quota = view.getByLabelText('Quota');
    await fireEvent.input(quota, { target: { value: '' } });
    await fireEvent.input(view.getByLabelText('Name'), { target: { value: 'Changed' } });
    expect((quota as HTMLInputElement).value).toBe('');
    await fireEvent.submit(form(view));
    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0]).not.toHaveProperty('quota');
    expect((quota as HTMLInputElement).value).toBe('');
  });
  it('uses independent submission data and preserves nested UI state when a handler mutates its input', async () => {
    const onsubmit = vi.fn((input: Record<string, unknown>) => {
      (input['profile'] as Record<string, unknown>)['city'] = 'Callback copy';
      input['name'] = 'Mutated';
    });
    const view = render(JsonSchemaForm, { schema, onsubmit });
    await fireEvent.submit(form(view));
    expect((view.getByLabelText('City') as HTMLInputElement).value).toBe('Tokyo');
    expect((view.getByLabelText('Name') as HTMLInputElement).value).toBe('Original');
    expect(onsubmit).toHaveBeenCalledOnce();
  });
  it('initializes untouched required false values inside newly added object arrays', async () => {
    const onsubmit = vi.fn(); const view = render(JsonSchemaForm, { schema, onsubmit, locale: 'en-US' });
    await fireEvent.click(view.getByRole('button', { name: 'Add item' }));
    await fireEvent.submit(form(view));
    expect(onsubmit).toHaveBeenCalledWith(expect.objectContaining({ rows: [{ active: false }] }));
  });
  it.each([[0, 1], [1, '1'], [2, null], [3, 'null'], [4, false], [5, 'false'], [6, '']] as const)(
    'retains enum option %s without string coercion', async (index, expected) => {
      const onsubmit = vi.fn();
      const view = render(JsonSchemaForm, { schema: { properties: { choice: { title: 'Choice', enum: [1, '1', null, 'null', false, 'false', ''] } } }, onsubmit });
      await fireEvent.change(view.getByLabelText('Choice'), { target: { value: String(index) } });
      await fireEvent.submit(form(view));
      expect(onsubmit).toHaveBeenCalledWith({ choice: expected });
    },
  );
  it('locks all controls before same-frame and reentrant submissions can dispatch', async () => {
    let finish: () => void = () => { throw new Error('Not started'); };
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const onsubmit = vi.fn<(input: Record<string, unknown>) => Promise<void>>(() => pending);
    const view = render(JsonSchemaForm, { schema, onsubmit, locale: 'en-US' });
    const element = form(view);
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(element.getAttribute('aria-busy')).toBe('true'));
    expect(onsubmit).toHaveBeenCalledOnce();
    const name = view.getByLabelText('Name');
    expect(name.matches(':disabled')).toBe(true);
    for (const control of element.querySelectorAll('input, select, button')) {
      expect(control.hasAttribute('disabled')).toBe(true);
    }
    await fireEvent.input(name, { target: { value: 'Synthetic event while busy' } });
    finish(); await waitFor(() => expect(element.getAttribute('aria-busy')).toBe('false'));
    await fireEvent.submit(element);
    expect(onsubmit.mock.calls[1]?.[0]).toEqual(onsubmit.mock.calls[0]?.[0]);
  });
  it('rejects synchronous callback reentry', async () => {
    const target: { element?: HTMLFormElement } = {};
    const onsubmit = vi.fn(() => { target.element?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    const view = render(JsonSchemaForm, { schema, onsubmit });
    const element = form(view);
    target.element = element;
    await fireEvent.submit(element); expect(onsubmit).toHaveBeenCalledOnce();
  });
  it('surfaces callback failure without losing the draft and permits an explicit retry', async () => {
    const onsubmit = vi.fn().mockRejectedValueOnce(new Error('Synthetic failure')).mockResolvedValueOnce(undefined);
    const onerror = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, onerror, locale: 'en-US' });
    await fireEvent.input(view.getByLabelText('Name'), { target: { value: 'Keep draft' } });
    await fireEvent.submit(form(view));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Submission did not complete'));
    expect(onerror).toHaveBeenCalledOnce();
    expect((view.getByLabelText('Name') as HTMLInputElement).value).toBe('Keep draft');
    await fireEvent.submit(form(view));
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
    expect(onsubmit).toHaveBeenCalledTimes(2);
  });
  it.each(['disabled', 'readonly'] as const)('blocks synthetic input and submission when %s', async mode => {
    const onsubmit = vi.fn(); const view = render(JsonSchemaForm, { schema, onsubmit, [mode]: true, locale: 'en-US' });
    await fireEvent.input(view.getByLabelText('Name'), { target: { value: 'Blocked' } });
    await fireEvent.click(view.getByRole('button', { name: 'Add item' }));
    await fireEvent.submit(form(view)); expect(onsubmit).not.toHaveBeenCalled();
    await view.rerender({ [mode]: false }); await fireEvent.submit(form(view));
    expect(onsubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Original', rows: [] }));
  });
  it('also respects an ancestor disabled fieldset without relying on native event suppression', async () => {
    const onsubmit = vi.fn(); const view = render(DisabledHost, { onsubmit });
    await fireEvent.submit(form(view)); expect(onsubmit).not.toHaveBeenCalled();
  });
  it.each(['replacement', 'unmount', 'disable'] as const)('does not publish stale failures after %s', async transition => {
    let reject: (error: Error) => void = () => { throw new Error('Not started'); };
    const onsubmit = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; })); const onerror = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, onerror });
    await fireEvent.submit(form(view));
    if (transition === 'unmount') view.unmount();
    else if (transition === 'disable') await view.rerender({ disabled: true });
    else await view.rerender({ value: { name: 'New context' } });
    reject(new Error('Old context')); await Promise.resolve(); await Promise.resolve();
    expect(onerror).not.toHaveBeenCalled();
    expect(view.queryByRole('alert')).toBeNull();
  });
  it('creates unique default IDs but preserves explicit host prefixes', () => {
    const a = render(JsonSchemaForm, { schema }), b = render(JsonSchemaForm, { schema });
    const ids = [...a.container.querySelectorAll('input'), ...b.container.querySelectorAll('input')].map(input => input.id);
    expect(new Set(ids).size).toBe(ids.length);
    const explicit = render(JsonSchemaForm, { schema, idPrefix: 'host-owned' });
    expect(explicit.container.querySelector('input')?.id).toBe('host-owned_name');
  });
  it('supports independent Chinese and English array-action labels', () => {
    const a = render(JsonSchemaForm, { schema, locale: 'zh-CN' }), b = render(JsonSchemaForm, { schema, locale: 'en-US' });
    expect(a.getByRole('button', { name: '添加项目' })).toBeTruthy();
    expect(b.getByRole('button', { name: 'Add item' })).toBeTruthy();
  });
  it('refuses non-JSON submission values instead of silently coercing them', async () => {
    const onsubmit = vi.fn(); const view = render(JsonSchemaForm, { schema: { properties: {} }, value: { hidden: Infinity }, onsubmit });
    await fireEvent.submit(form(view)); expect(onsubmit).not.toHaveBeenCalled(); expect(view.getByRole('alert')).toBeTruthy();
  });
});
