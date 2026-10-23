import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import ModalForm from './ModalForm.svelte';
import DrawerForm from './DrawerForm.svelte';
import Harness from './modal-drawer-form.test-harness.svelte';

const kinds = ['modal', 'drawer'] as const;
type Kind = (typeof kinds)[number];
type FormProps = {
  kind: Kind;
  open: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  onsubmit?: () => void | Promise<void>;
  oncancel?: () => void;
};

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function clickSave(view: { getByRole(role: string, options?: { name?: string }): HTMLElement }) {
  await fireEvent.click(view.getByRole('button', { name: 'Save' }));
  await tick();
}

async function settle() {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  await tick();
}

function panel(view: { getByRole(role: string, options?: { name?: string }): HTMLElement }, kind: Kind) {
  if (kind === 'drawer') {
    const element = document.querySelector('[data-slot="sheet"]');
    if (!element) throw new Error('Expected sheet panel');
    return element as HTMLElement;
  }
  return view.getByRole('dialog');
}

function queryPanel(view: { queryByRole(role: string, options?: { name?: string }): HTMLElement | null }, kind: Kind) {
  if (kind === 'drawer') return document.querySelector('[data-slot="sheet"]');
  return view.queryByRole('dialog');
}

function form(view: { getByRole(role: string, options?: { name?: string }): HTMLElement }, kind: Kind) {
  const element = panel(view, kind).querySelector('form');
  if (!element) throw new Error('Expected form element');
  return element as HTMLFormElement;
}

const dismissActions = ['Cancel', 'Close', 'Escape', 'overlay'] as const;
type DismissAction = (typeof dismissActions)[number];

async function dismiss(view: { getByRole(role: string, options?: { name?: string }): HTMLElement }, kind: Kind, action: DismissAction) {
  if (action === 'Escape') {
    await fireEvent.keyDown(document.body, { key: 'Escape' });
  } else if (action === 'overlay') {
    if (kind === 'modal') {
      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      if (!overlay) throw new Error('Expected dialog overlay');
      await new Promise<void>(resolve => setTimeout(resolve, 10));
      await fireEvent.pointerDown(overlay, {
        button: 0,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 100,
      });
      await new Promise<void>(resolve => setTimeout(resolve, 30));
    } else {
      const overlay = document.querySelector('.svadmin-sheet-overlay');
      if (!overlay) throw new Error('Expected sheet overlay');
      await fireEvent.click(overlay);
    }
  } else {
    await fireEvent.click(view.getByRole('button', { name: action }));
  }
  await tick();
}

describe('ModalForm and DrawerForm Components', () => {
  it('renders ModalForm trigger button', () => {
    const view = render(ModalForm, {
      title: 'New Member',
      triggerText: 'Add Member',
    });
    expect(view.container.textContent).toContain('Add Member');
  });

  it('renders DrawerForm trigger button', () => {
    const view = render(DrawerForm, {
      title: 'Edit Config',
      triggerText: 'Configure',
    });
    expect(view.container.textContent).toContain('Configure');
  });

  it.each(kinds)('%s keeps the draft open and shows a safe error for sync/async failures', async kind => {
    const onsubmit = vi.fn()
      .mockImplementationOnce(() => { throw new Error('PRIVATE_SYNC_DIAGNOSTIC'); })
      .mockRejectedValueOnce(new Error('PRIVATE_ASYNC_DIAGNOSTIC'))
      .mockResolvedValueOnce(undefined);
    const view = render(Harness, { kind, open: true, onsubmit });
    const draft = view.getByLabelText('Draft');
    await fireEvent.input(draft, { target: { value: 'Changed draft' } });

    await clickSave(view);
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Operation failed'));
    expect(panel(view, kind)).toBeTruthy();
    expect(draft).toHaveProperty('value', 'Changed draft');
    expect(document.body.textContent).not.toContain('PRIVATE_SYNC_DIAGNOSTIC');

    await clickSave(view);
    await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Operation failed'));
    expect(panel(view, kind)).toBeTruthy();
    expect(draft).toHaveProperty('value', 'Changed draft');
    expect(document.body.textContent).not.toContain('PRIVATE_ASYNC_DIAGNOSTIC');

    await clickSave(view);
    await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
    expect(onsubmit).toHaveBeenCalledTimes(3);
  });

  it.each(kinds)('%s does not invoke onsubmit while disabled or isSubmitting', async kind => {
    for (const blocked of [{ disabled: true }, { isSubmitting: true }]) {
      const onsubmit = vi.fn();
      const view = render(Harness, { kind, open: true, onsubmit, ...blocked });
      form(view, kind).requestSubmit();
      form(view, kind).dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
      await settle();
      expect(onsubmit).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it.each(kinds)('%s exposes local and external pending state through aria-busy', async kind => {
    const gate = deferred();
    const onsubmit = vi.fn(() => gate.promise);
    const view = render(Harness, { kind, open: true, onsubmit });
    const currentForm = form(view, kind);

    expect(currentForm.getAttribute('aria-busy')).toBe('false');
    await clickSave(view);
    await waitFor(() => expect(currentForm.getAttribute('aria-busy')).toBe('true'));

    gate.reject(new Error('PRIVATE_ARIA_BUSY_DIAGNOSTIC'));
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(currentForm.getAttribute('aria-busy')).toBe('false');

    await view.rerender({ kind, open: true, onsubmit, isSubmitting: true });
    await tick();
    expect(form(view, kind).getAttribute('aria-busy')).toBe('true');

    await view.rerender({ kind, open: true, onsubmit, isSubmitting: false });
    await tick();
    expect(form(view, kind).getAttribute('aria-busy')).toBe('false');
  });

  it.each(kinds)('%s suppresses repeated SubmitEvent while a local submit is pending', async kind => {
    const gate = deferred();
    const onsubmit = vi.fn(() => gate.promise);
    const view = render(Harness, { kind, open: true, onsubmit });

    await clickSave(view);
    const element = form(view, kind);
    element.requestSubmit();
    element.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(onsubmit).toHaveBeenCalledTimes(1);

    gate.resolve();
    await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
  });

  it.each(kinds)('%s really closes an idle form for every dismiss action', async kind => {
    for (const action of dismissActions) {
      const view = render(Harness, { kind, open: true, onsubmit: vi.fn() });
      expect(panel(view, kind)).toBeTruthy();

      await dismiss(view, kind, action);
      await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
      view.unmount();
    }
  });

  it.each(kinds)('%s keeps the form open and skips every dismiss while local or external submit is pending', async kind => {
    for (const mode of ['local', 'external'] as const) {
      for (const action of dismissActions) {
        const gate = deferred();
        const onsubmit = mode === 'local' ? vi.fn(() => gate.promise) : vi.fn();
        const oncancel = vi.fn();
        const props: FormProps = {
          kind,
          open: true,
          onsubmit,
          oncancel,
          isSubmitting: mode === 'external',
        };
        const view = render(Harness, props);
        if (mode === 'local') await clickSave(view);
        else await tick();

        await dismiss(view, kind, action);

        expect(panel(view, kind)).toBeTruthy();
        expect(oncancel).not.toHaveBeenCalled();
        expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
        if (mode === 'local') {
          gate.resolve();
          await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
        } else {
          await view.rerender({ ...props, isSubmitting: false });
          await tick();
          expect(panel(view, kind)).toBeTruthy();

          await dismiss(view, kind, action);
          await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
        }
        view.unmount();
      }
    }
  });

  it.each(kinds)('%s ignores a stale rejection after forced reopen and a callback switch', async kind => {
    const first = deferred();
    const second = deferred();
    const firstSubmit = vi.fn(() => first.promise);
    const secondSubmit = vi.fn(() => second.promise);
    const base: FormProps = { kind, open: true, onsubmit: firstSubmit };
    const view = render(Harness, base);

    await clickSave(view);
    await view.rerender({ ...base, open: false });
    await tick();
    await view.rerender({ ...base, open: true, onsubmit: secondSubmit });
    await tick();
    await clickSave(view);
    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).toHaveBeenCalledTimes(1);

    first.reject(new Error('PRIVATE_STALE_DIAGNOSTIC'));
    await settle();
    expect(panel(view, kind)).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
    expect(document.body.textContent).not.toContain('PRIVATE_STALE_DIAGNOSTIC');

    second.reject(new Error('PRIVATE_CURRENT_DIAGNOSTIC'));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Operation failed'));
    expect(panel(view, kind)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);
    expect(document.body.textContent).not.toContain('PRIVATE_CURRENT_DIAGNOSTIC');
  });

  it.each(kinds)('%s ignores a stale success after forced reopen', async kind => {
    const first = deferred();
    const retry = vi.fn().mockResolvedValue(undefined);
    const base: FormProps = { kind, open: true, onsubmit: () => first.promise };
    const view = render(Harness, base);

    await clickSave(view);
    await view.rerender({ ...base, open: false });
    await tick();
    await view.rerender({ ...base, open: true, onsubmit: retry });
    await tick();

    first.resolve();
    await settle();
    expect(panel(view, kind)).toBeTruthy();

    await clickSave(view);
    await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each(kinds)('%s isolates an old success after replacing onsubmit while open', async kind => {
    const first = deferred();
    const firstSubmit = vi.fn(() => first.promise);
    const secondSubmit = vi.fn().mockResolvedValue(undefined);
    const base: FormProps = { kind, open: true, onsubmit: firstSubmit };
    const view = render(Harness, base);

    await clickSave(view);
    await view.rerender({ ...base, onsubmit: secondSubmit });
    await tick();

    first.resolve();
    await settle();
    expect(panel(view, kind)).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);

    await clickSave(view);
    await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).toHaveBeenCalledTimes(1);
  });

  it.each(kinds)('%s isolates an old failure after replacing onsubmit while open', async kind => {
    const first = deferred();
    const firstSubmit = vi.fn(() => first.promise);
    const secondSubmit = vi.fn().mockResolvedValue(undefined);
    const base: FormProps = { kind, open: true, onsubmit: firstSubmit };
    const view = render(Harness, base);

    await clickSave(view);
    await view.rerender({ ...base, onsubmit: secondSubmit });
    await tick();

    first.reject(new Error('PRIVATE_REPLACED_DIAGNOSTIC'));
    await settle();
    expect(panel(view, kind)).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);
    expect(document.body.textContent).not.toContain('PRIVATE_REPLACED_DIAGNOSTIC');

    await clickSave(view);
    await waitFor(() => expect(queryPanel(view, kind)).toBeNull());
    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).toHaveBeenCalledTimes(1);
  });

  it.each(kinds)('%s old finally cannot unlock a newer submit after replacing onsubmit', async kind => {
    const first = deferred();
    const second = deferred();
    const firstSubmit = vi.fn(() => first.promise);
    const secondSubmit = vi.fn(() => second.promise);
    const base: FormProps = { kind, open: true, onsubmit: firstSubmit };
    const view = render(Harness, base);

    await clickSave(view);
    await view.rerender({ ...base, onsubmit: secondSubmit });
    await tick();
    await clickSave(view);
    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).toHaveBeenCalledTimes(1);

    first.reject(new Error('PRIVATE_OLD_FINALLY_DIAGNOSTIC'));
    await settle();
    expect(panel(view, kind)).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
    expect(document.body.textContent).not.toContain('PRIVATE_OLD_FINALLY_DIAGNOSTIC');

    second.reject(new Error('PRIVATE_NEW_CURRENT_DIAGNOSTIC'));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Operation failed'));
    expect(panel(view, kind)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);
    expect(document.body.textContent).not.toContain('PRIVATE_NEW_CURRENT_DIAGNOSTIC');
  });

  it.each(kinds)('%s ignores a SubmitEvent from a form detached by forced close', async kind => {
    const gate = deferred();
    const onsubmit = vi.fn(() => gate.promise);
    const base: FormProps = { kind, open: true, onsubmit };
    const view = render(Harness, base);

    await clickSave(view);
    const staleForm = form(view, kind);
    await view.rerender({ ...base, open: false });
    await tick();
    expect(queryPanel(view, kind)).toBeNull();

    staleForm.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(onsubmit).toHaveBeenCalledTimes(1);

    gate.resolve();
    await settle();
    expect(queryPanel(view, kind)).toBeNull();
  });

  it.each(kinds)('%s ignores a stale form SubmitEvent after forced close and reopen', async kind => {
    const first = deferred();
    const firstSubmit = vi.fn(() => first.promise);
    const secondSubmit = vi.fn();
    const base: FormProps = { kind, open: true, onsubmit: firstSubmit };
    const view = render(Harness, base);

    await clickSave(view);
    const staleForm = form(view, kind);
    await view.rerender({ ...base, open: false });
    await tick();
    await view.rerender({ ...base, open: true, onsubmit: secondSubmit });
    await tick();
    expect(panel(view, kind)).toBeTruthy();

    staleForm.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).not.toHaveBeenCalled();
    expect(panel(view, kind)).toBeTruthy();

    first.resolve();
    await settle();
    expect(panel(view, kind)).toBeTruthy();
  });

  it.each(kinds)('%s ignores a SubmitEvent from a form detached by unmount', async kind => {
    const gate = deferred();
    const onsubmit = vi.fn(() => gate.promise);
    const view = render(Harness, { kind, open: true, onsubmit });

    await clickSave(view);
    const staleForm = form(view, kind);
    view.unmount();

    staleForm.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(onsubmit).toHaveBeenCalledTimes(1);

    gate.resolve();
    await settle();
  });

  it.each(kinds)('%s ignores a settled request after unmount', async kind => {
    for (const outcome of ['resolve', 'reject'] as const) {
      const gate = deferred();
      const view = render(Harness, { kind, open: true, onsubmit: () => gate.promise });
      await clickSave(view);
      view.unmount();
      if (outcome === 'resolve') gate.resolve();
      else gate.reject(new Error('PRIVATE_UNMOUNT_DIAGNOSTIC'));
      await settle();
    }
  });
});
