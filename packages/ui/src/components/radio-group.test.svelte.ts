import { act, cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { resetI18n } from '@svadmin/core/i18n';
import { setLocale } from '../../test/legacy-locale';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RadioGroup from './RadioGroup.svelte';
import IsolationHost from './radio-group-isolation.test-host.svelte';

afterEach(() => {
  resetI18n();
  cleanup();
  vi.restoreAllMocks();
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

  it.each([false, true])('isolates labels and values across two forms when named=%s', async named => {
    const onchange = vi.fn<(group: 'first' | 'second', value: 'personal' | 'team' | 'company') => void>();
    const view = render(IsolationHost, { named, onchange });
    const firstForm = view.getByRole('form', { name: 'First form' });
    const secondForm = view.getByRole('form', { name: 'Second form' });
    if (!(firstForm instanceof HTMLFormElement) || !(secondForm instanceof HTMLFormElement)) {
      throw new Error('Expected two forms');
    }
    const first = within(firstForm);
    const second = within(secondForm);
    const inputs = [...view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    const ids = inputs.map(input => input.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
    for (const input of inputs) {
      expect(input.labels?.length).toBeGreaterThan(0);
      expect([...input.labels ?? []].every(label => label.control === input)).toBe(true);
      expect(input.name).toBe(named ? 'visibility' : '');
    }

    await fireEvent.click(first.getByText('Personal'));
    await fireEvent.click(second.getByText('Company'));
    expect(view.getByTestId('first-value').textContent).toBe('personal');
    expect(view.getByTestId('second-value').textContent).toBe('company');
    expect(first.getByRole('radio', { name: /Personal/ })).toHaveProperty('checked', true);
    expect(second.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', true);
    expect(new FormData(firstForm).getAll('visibility')).toEqual(named ? ['personal'] : []);
    expect(new FormData(secondForm).getAll('visibility')).toEqual(named ? ['company'] : []);
    expect(onchange.mock.calls).toEqual([['first', 'personal'], ['second', 'company']]);

    await view.rerender({ named: !named });
    expect(inputs.map(input => input.id)).toEqual(ids);
    expect(new FormData(firstForm).getAll('visibility')).toEqual(named ? [] : ['personal']);
    expect(new FormData(secondForm).getAll('visibility')).toEqual(named ? [] : ['company']);
    expect(onchange).toHaveBeenCalledTimes(2);
  });

  it('uses valid opaque ids without changing arbitrary option values', async () => {
    const onchange = vi.fn<(value: string) => void>();
    const values = ['two words', 'quote"value', 'percent%value', ''] as const;
    const view = render(RadioGroup, {
      options: values.map((value, index) => ({ value, label: `Choice ${index + 1}` })),
      legend: 'Arbitrary values',
      name: 'with spaces',
      onchange,
    });
    const inputs = [...view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(inputs.map(input => input.value)).toEqual(values);
    for (const input of inputs) {
      expect(input.id).not.toMatch(/\s/);
      expect(input.labels?.length).toBeGreaterThan(0);
      expect([...input.labels ?? []].every(label => label.control === input)).toBe(true);
    }
    await fireEvent.click(view.getByText('Choice 4'));
    expect(onchange).toHaveBeenCalledExactlyOnceWith('');
    expect(view.getByRole('radio', { name: 'Choice 4' })).toHaveProperty('checked', true);
  });

  it('keeps arrow navigation inside an unnamed group in a shared form', async () => {
    const onchange = vi.fn<(group: 'first' | 'second', value: 'personal' | 'team' | 'company') => void>();
    const view = render(IsolationHost, { sharedForm: true, onchange });
    const first = within(view.getByRole('group', { name: 'First visibility' }));
    const second = within(view.getByRole('group', { name: 'Second visibility' }));

    await fireEvent.click(first.getByText('Personal'));
    await fireEvent.click(second.getByText('Company'));
    const form = view.getByRole('form', { name: 'Shared form' });
    const nativeChange = vi.fn();
    form.addEventListener('change', nativeChange);
    let current = first.getByRole('radio', { name: /Personal/ });
    for (const [key, next] of [
      ['ArrowDown', 'company'],
      ['ArrowDown', 'personal'],
      ['ArrowUp', 'company'],
      ['Home', 'personal'],
      ['End', 'company'],
    ] as const) {
      await fireEvent.keyDown(current, { key });
      current = first.getByRole('radio', { name: next === 'personal' ? /Personal/ : 'Company' });
      expect(view.getByTestId('first-value').textContent).toBe(next);
      expect(view.getByTestId('second-value').textContent).toBe('company');
      expect(current).toHaveProperty('checked', true);
      expect(second.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', true);
      expect(current.getAttribute('tabindex')).toBe('0');
      expect(document.activeElement).toBe(current);
    }
    await fireEvent.keyDown(current, { key: 'End' });
    expect(nativeChange).toHaveBeenCalledTimes(5);
    expect(onchange.mock.calls).toEqual([
      ['first', 'personal'],
      ['second', 'company'],
      ['first', 'company'],
      ['first', 'personal'],
      ['first', 'company'],
      ['first', 'personal'],
      ['first', 'company'],
    ]);
  });

  it('keeps unnamed required validation inside its own shared-form group', async () => {
    const view = render(IsolationHost, { sharedForm: true, required: true });
    const form = view.getByRole('form', { name: 'Shared form' });
    if (!(form instanceof HTMLFormElement)) throw new Error('Expected a form');
    const first = within(view.getByRole('group', { name: 'First visibility' }));
    const second = within(view.getByRole('group', { name: 'Second visibility' }));
    const inputs = [...view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];

    expect(inputs.every(input => !input.required)).toBe(true);
    expect(form.checkValidity()).toBe(false);
    await fireEvent.click(second.getByText('Company'));
    expect(form.checkValidity()).toBe(false);
    await fireEvent.click(first.getByText('Company'));
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).getAll('visibility')).toEqual([]);
  });

  it('treats an empty name exactly like an omitted name', async () => {
    const view = render(IsolationHost, { sharedForm: true, emptyName: true, required: true });
    const form = view.getByRole('form', { name: 'Shared form' });
    if (!(form instanceof HTMLFormElement)) throw new Error('Expected a form');
    const first = within(view.getByRole('group', { name: 'First visibility' }));
    const second = within(view.getByRole('group', { name: 'Second visibility' }));
    const inputs = [...view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];

    expect(inputs.every(input => input.name === '')).toBe(true);
    expect(inputs.every(input => !input.required)).toBe(true);
    expect(inputs[0]?.validity.customError).toBe(true);
    expect(form.checkValidity()).toBe(false);

    await fireEvent.click(first.getByText('Company'));
    await fireEvent.click(second.getByText('Company'));
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).getAll('visibility')).toEqual([]);
  });

  it.each(['named', 'disabled', 'option', 'platform-disabled', 'ctrl', 'meta', 'alt'] as const)(
    'does not override native or disabled keyboard behavior for %s',
    async scenario => {
      const onchange = vi.fn<(value: string) => void>();
      const view = render(RadioGroup, {
        options, value: 'personal', legend: 'Visibility', onchange,
        disabled: scenario === 'disabled',
        ...(scenario === 'named' ? { name: 'visibility' } : {}),
      });
      const current = view.getByRole('radio', { name: scenario === 'option' ? 'Team' : /Personal/ });
      if (scenario === 'platform-disabled') {
        // 继承禁用的 CSS 判断另由 Chromium 验证，此处只验证事件处理边界。
        const matches = current.matches.bind(current);
        vi.spyOn(current, 'matches').mockImplementation(selector => selector === ':disabled' || matches(selector));
      }
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true, cancelable: true,
        ctrlKey: scenario === 'ctrl', metaKey: scenario === 'meta', altKey: scenario === 'alt',
      });
      await fireEvent(current, event);
      expect(event.defaultPrevented).toBe(false);
      expect(onchange).not.toHaveBeenCalled();
      expect(view.getByRole('radio', { name: /Personal/ })).toHaveProperty('checked', true);
    },
  );

  it('keeps one unnamed tab stop without selecting an unavailable or removed value', async () => {
    const onchange = vi.fn<(value: string) => void>();
    const view = render(RadioGroup, { options, value: 'team', legend: 'Visibility', onchange });
    const personal = view.getByRole('radio', { name: /Personal/ });
    expect(personal.getAttribute('tabindex')).toBe('0');
    expect(view.getByRole('radio', { name: 'Team' })).toHaveProperty('checked', true);
    expect(view.getAllByRole('radio').filter(input => input.getAttribute('tabindex') === '0')).toHaveLength(1);

    await view.rerender({ value: null });
    expect(view.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(personal.getAttribute('tabindex')).toBe('0');
    await view.rerender({ disabled: true });
    expect(view.getAllByRole('radio').every(input => input.getAttribute('tabindex') === '-1')).toBe(true);
    await view.rerender({ disabled: false, options: [] });
    expect(view.queryAllByRole('radio')).toHaveLength(0);
    await view.rerender({ options: options.map(option => ({ ...option, disabled: true })) });
    expect(view.getAllByRole('radio').every(input => input.getAttribute('tabindex') === '-1')).toBe(true);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('keeps unnamed required custom validity synchronized with locale without extra changes', async () => {
    const onchange = vi.fn<(value: string) => void>();
    const view = render(RadioGroup, {
      options,
      value: 'team',
      required: true,
      legend: 'Visibility',
      onchange,
    });
    const firstInput = () => view.getAllByRole('radio')[0] as HTMLInputElement;

    expect(firstInput().validity.customError).toBe(true);
    expect(firstInput().validationMessage).toBe('This field is required');
    expect(view.getByRole('radio', { name: 'Team' })).toHaveProperty('checked', true);

    setLocale('zh-CN');
    await tick();
    expect(firstInput().validationMessage).toBe('此字段为必填项');
    expect(view.getByRole('radio', { name: 'Team' })).toHaveProperty('checked', true);

    setLocale('en');
    await tick();
    expect(firstInput().validationMessage).toBe('This field is required');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not retain stale unnamed required custom validity across lifecycle changes', async () => {
    const view = render(RadioGroup, { options, required: true, legend: 'Visibility' });
    const firstInput = () => view.getAllByRole('radio')[0] as HTMLInputElement;

    expect(firstInput().validity.customError).toBe(true);

    await view.rerender({ options, required: true, legend: 'Visibility', name: 'visibility' });
    expect(firstInput().required).toBe(true);
    expect(firstInput().validity.customError).toBe(false);

    await view.rerender({ options, required: false, name: undefined, legend: 'Visibility' });
    expect(firstInput().required).toBe(false);
    expect(firstInput().validity.customError).toBe(false);

    await view.rerender({ options, required: true, name: undefined, legend: 'Visibility', disabled: true });
    expect(firstInput().validity.customError).toBe(false);
    await view.rerender({ options, required: true, name: undefined, legend: 'Visibility', disabled: false });
    expect(firstInput().validity.customError).toBe(true);

    const replacement = [
      { value: 'alpha', label: 'Alpha' },
      { value: 'beta', label: 'Beta' },
    ] as const;
    await view.rerender({ options: replacement, required: true, name: undefined, legend: 'Visibility' });
    expect(firstInput().value).toBe('alpha');
    expect(firstInput().validity.customError).toBe(true);

    await view.rerender({ options: replacement, required: true, name: undefined, legend: 'Visibility', value: 'beta' });
    expect(firstInput().validity.customError).toBe(false);
    await view.rerender({ options: replacement, required: true, name: undefined, legend: 'Visibility', value: null });
    expect(firstInput().validity.customError).toBe(true);
  });

  it('leaves unnamed native radios outside the component to native tab behavior', async () => {
    const view = render(IsolationHost, { sharedForm: true, nativeBoundary: true });
    const first = within(view.getByRole('group', { name: 'First visibility' }));
    const current = first.getByRole('radio', { name: /Personal/ }) as HTMLInputElement;
    current.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    await fireEvent(current, event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(current);
  });

  it('reverses horizontal unnamed navigation for RTL without changing vertical order', async () => {
    const onchange = vi.fn<(value: string) => void>();
    const view = render(RadioGroup, {
      options: [...options, { value: 'department', label: 'Department' }],
      value: 'company', legend: 'Visibility', onchange,
    });
    view.getByRole('group', { name: 'Visibility' }).style.direction = 'rtl';
    await fireEvent.keyDown(view.getByRole('radio', { name: 'Company' }), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(view.getByRole('radio', { name: /Personal/ }));
    await fireEvent.keyDown(view.getByRole('radio', { name: /Personal/ }), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(view.getByRole('radio', { name: 'Company' }));
    await fireEvent.keyDown(view.getByRole('radio', { name: 'Company' }), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(view.getByRole('radio', { name: 'Department' }));
    expect(onchange.mock.calls).toEqual([['personal'], ['company'], ['department']]);
  });

  it.each([false, true])(
    'restores the initial selection and binding after native reset when named=%s',
    async named => {
      const onchange = vi.fn<(group: 'first' | 'second', value: 'personal' | 'team' | 'company') => void>();
      const view = render(IsolationHost, {
        named,
        initialFirst: 'company',
        initialSecond: null,
        onchange,
      });
      const firstForm = view.getByRole('form', { name: 'First form' });
      const secondForm = view.getByRole('form', { name: 'Second form' });
      if (!(firstForm instanceof HTMLFormElement) || !(secondForm instanceof HTMLFormElement)) {
        throw new Error('Expected two forms');
      }
      const first = within(firstForm);
      const second = within(secondForm);

      expect(first.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', true);
      expect(second.queryAllByRole('radio', { checked: true })).toHaveLength(0);
      await fireEvent.click(first.getByText('Personal'));
      await fireEvent.click(second.getByText('Personal'));
      expect(view.getByTestId('first-value').textContent).toBe('personal');
      expect(view.getByTestId('second-value').textContent).toBe('personal');

      await act(async () => {
        firstForm.reset();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      });
      expect(view.getByTestId('first-value').textContent).toBe('company');
      expect(first.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', true);
      expect(first.getByRole('radio', { name: /Personal/ })).toHaveProperty('checked', false);
      expect(view.getByTestId('second-value').textContent).toBe('personal');
      expect(second.getByRole('radio', { name: /Personal/ })).toHaveProperty('checked', true);
      expect(new FormData(firstForm).getAll('visibility')).toEqual(named ? ['company'] : []);
      expect(new FormData(secondForm).getAll('visibility')).toEqual(named ? ['personal'] : []);

      await act(async () => {
        secondForm.reset();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      });
      expect(view.getByTestId('second-value').textContent).toBe('null');
      expect(second.queryAllByRole('radio', { checked: true })).toHaveLength(0);
      expect(new FormData(secondForm).getAll('visibility')).toEqual([]);
      expect(new FormData(firstForm).getAll('visibility')).toEqual(named ? ['company'] : []);
      expect(onchange.mock.calls).toEqual([['first', 'personal'], ['second', 'personal']]);
    },
  );

  it.each([false, true])(
    'keeps the current selection and binding when native reset is prevented when named=%s',
    async named => {
      const onchange = vi.fn<(group: 'first' | 'second', value: 'personal' | 'team' | 'company') => void>();
      const view = render(IsolationHost, {
        named,
        initialFirst: 'company',
        initialSecond: null,
        onchange,
      });
      const firstForm = view.getByRole('form', { name: 'First form' });
      if (!(firstForm instanceof HTMLFormElement)) throw new Error('Expected a form');
      const first = within(firstForm);

      await fireEvent.click(first.getByText('Personal'));
      firstForm.addEventListener('reset', event => event.preventDefault());
      await act(async () => {
        firstForm.reset();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      });

      expect(view.getByTestId('first-value').textContent).toBe('personal');
      expect(first.getByRole('radio', { name: /Personal/ })).toHaveProperty('checked', true);
      expect(first.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', false);
      expect(new FormData(firstForm).getAll('visibility')).toEqual(named ? ['personal'] : []);
      expect(onchange.mock.calls).toEqual([['first', 'personal']]);
    },
  );

  it.each([false, true])(
    'keeps the last same-task user selection after a native reset when named=%s',
    async named => {
      const onchange = vi.fn<(group: 'first' | 'second', value: 'personal' | 'team' | 'company') => void>();
      const view = render(IsolationHost, {
        named,
        initialFirst: 'personal',
        initialSecond: null,
        onchange,
      });
      const firstForm = view.getByRole('form', { name: 'First form' });
      if (!(firstForm instanceof HTMLFormElement)) throw new Error('Expected a form');
      const first = within(firstForm);

      await fireEvent.click(first.getByText('Company'));
      expect(view.getByTestId('first-value').textContent).toBe('company');
      expect(first.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', true);

      await act(async () => {
        // reset 的延迟冲刷尚未执行时，同一任务内的用户选择必须优先。
        firstForm.reset();
        await fireEvent.click(first.getByRole('radio', { name: 'Company' }));
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      });

      expect(view.getByTestId('first-value').textContent).toBe('company');
      expect(first.getByRole('radio', { name: 'Company' })).toHaveProperty('checked', true);
      expect(first.getByRole('radio', { name: /Personal/ })).toHaveProperty('checked', false);
      expect(new FormData(firstForm).getAll('visibility')).toEqual(named ? ['company'] : []);
      expect(onchange.mock.calls).toEqual([['first', 'company']]);
    },
  );

  it.each([false, true])(
    'rebuilds required validity after native reset when named=%s',
    async named => {
      const view = render(IsolationHost, {
        named,
        required: true,
        initialFirst: 'company',
        initialSecond: null,
      });
      const firstForm = view.getByRole('form', { name: 'First form' });
      const secondForm = view.getByRole('form', { name: 'Second form' });
      if (!(firstForm instanceof HTMLFormElement) || !(secondForm instanceof HTMLFormElement)) {
        throw new Error('Expected two forms');
      }
      const first = within(firstForm);
      const second = within(secondForm);

      expect(firstForm.checkValidity()).toBe(true);
      expect(secondForm.checkValidity()).toBe(false);
      await fireEvent.click(second.getByText('Personal'));
      expect(secondForm.checkValidity()).toBe(true);

      await act(async () => {
        secondForm.reset();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      });
      expect(secondForm.checkValidity()).toBe(false);
      const secondInput = second.getAllByRole('radio')[0] as HTMLInputElement;
      expect(named ? secondInput.validity.valueMissing : secondInput.validity.customError).toBe(true);

      await fireEvent.click(first.getByText('Personal'));
      expect(firstForm.checkValidity()).toBe(true);
      await act(async () => {
        firstForm.reset();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      });
      expect(view.getByTestId('first-value').textContent).toBe('company');
      expect(firstForm.checkValidity()).toBe(true);
    },
  );
});
