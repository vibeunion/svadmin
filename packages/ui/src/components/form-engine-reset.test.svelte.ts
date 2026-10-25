import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import Host from '../../test/fixtures/FormEngineResetHarness.svelte';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('form engine explicit reset', () => {
  it('AutoForm reset restores the baseline and clears validation feedback', async () => {
    const view = render(Host, { kind: 'auto' });
    const name = await view.findByRole('textbox', { name: /^Name/ });
    const description = await view.findByRole('textbox', { name: /^Description/ });

    expect(name).toHaveProperty('value', 'Baseline');
    expect(description).toHaveProperty('value', 'Baseline description');

    await fireEvent.input(name, { target: { value: '' } });
    await fireEvent.input(description, { target: { value: 'Draft description' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await view.findByRole('region', { name: 'Please fix the following errors' });
    expect(name.getAttribute('aria-invalid')).toBe('true');

    view.component.reset();

    await waitFor(() => expect(name).toHaveProperty('value', 'Baseline'));
    expect(description).toHaveProperty('value', 'Baseline description');
    expect(name.getAttribute('aria-invalid')).not.toBe('true');
    expect(view.queryByRole('region', { name: 'Please fix the following errors' })).toBeNull();
    expect(view.queryByText('Draft description')).toBeNull();
  });

  it('StepsForm reset restores the first step, baseline values and validation feedback', async () => {
    const view = render(Host, { kind: 'steps' });
    const name = await view.findByRole('textbox', { name: /^Name/ });

    await fireEvent.input(name, { target: { value: 'Changed name' } });
    await fireEvent.click(view.getByRole('button', { name: 'Next' }));
    const description = await view.findByRole('textbox', { name: /^Description/ });
    await fireEvent.input(description, { target: { value: 'Changed description' } });

    view.component.reset();

    await waitFor(() => expect(view.getByRole('textbox', { name: /^Name/ })).toHaveProperty('value', 'Baseline'));
    expect(view.queryByRole('textbox', { name: /^Description/ })).toBeNull();
    expect(view.getByRole('button', { name: 'Next' })).toBeTruthy();

    await fireEvent.click(view.getByRole('button', { name: 'Next' }));
    expect(await view.findByRole('textbox', { name: /^Description/ }))
      .toHaveProperty('value', 'Baseline description');
  });

  it('AutoForm reset retires an in-flight success so a new submit owns the receipt', async () => {
    const view = render(Host, { kind: 'auto', redirect: 'list' });
    const name = await view.findByRole('textbox', { name: /^Name/ }) as HTMLInputElement;
    const description = await view.findByRole('textbox', { name: /^Description/ }) as HTMLInputElement;

    await fireEvent.input(name, { target: { value: 'Old submit' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(1));
    expect(view.component.writeVariables(0)).toMatchObject({ name: 'Old submit' });

    view.component.reset();
    await waitFor(() => expect(name.value).toBe('Baseline'));

    await fireEvent.input(name, { target: { value: 'New submit' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(2));
    expect(view.component.writeVariables(1)).toMatchObject({ name: 'New submit' });

    view.component.resolveWrite(1, { name: 'Server new', description: 'Server new description' });
    await waitFor(() => expect(view.component.successCount()).toBe(1));
    expect(name.value).toBe('Server new');
    expect(description.value).toBe('Server new description');
    expect(view.component.navigationCount()).toBe(1);

    view.component.resolveWrite(0, { name: 'Server old', description: 'Server old description' });
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(0));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(name.value).toBe('Server new');
    expect(description.value).toBe('Server new description');
    expect(view.component.successCount()).toBe(1);
    expect(view.component.navigationCount()).toBe(1);
  });

  it('AutoForm reset rejects a late failure after the draft is restored', async () => {
    const view = render(Host, { kind: 'auto' });
    const name = await view.findByRole('textbox', { name: /^Name/ }) as HTMLInputElement;

    await fireEvent.input(name, { target: { value: 'Old failure submit' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(1));

    view.component.reset();
    await waitFor(() => expect(name.value).toBe('Baseline'));
    await fireEvent.input(name, { target: { value: 'Fresh draft after reset' } });
    view.component.rejectWrite(0, 'old provider failure');
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(name.value).toBe('Fresh draft after reset');
    expect(view.queryByRole('region', { name: 'Please fix the following errors' })).toBeNull();
    expect(view.queryByText('old provider failure')).toBeNull();
    expect(view.component.successCount()).toBe(0);
    expect(view.component.navigationCount()).toBe(0);
  });

  it('AutoForm reset keeps the restored baseline when the retired success arrives first', async () => {
    const view = render(Host, { kind: 'auto', redirect: 'list' });
    const name = await view.findByRole('textbox', { name: /^Name/ }) as HTMLInputElement;
    const description = await view.findByRole('textbox', { name: /^Description/ }) as HTMLInputElement;

    await fireEvent.input(name, { target: { value: 'Old submit' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(1));

    view.component.reset();
    await waitFor(() => expect(name.value).toBe('Baseline'));
    view.component.resolveWrite(0, { name: 'Server old', description: 'Server old description' });
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(name.value).toBe('Baseline');
    expect(description.value).toBe('Baseline description');
    expect(view.component.successCount()).toBe(0);
    expect(view.component.navigationCount()).toBe(0);
  });

  it('StepsForm reset retires an in-flight success before the next independent submit', async () => {
    const view = render(Host, { kind: 'steps' });
    const name = await view.findByRole('textbox', { name: /^Name/ }) as HTMLInputElement;

    await fireEvent.input(name, { target: { value: 'Old step' } });
    await fireEvent.click(view.getByRole('button', { name: 'Next' }));
    const oldDescription = await view.findByRole('textbox', { name: /^Description/ }) as HTMLInputElement;
    await fireEvent.input(oldDescription, { target: { value: 'Old step description' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(1));
    expect(view.component.writeVariables(0)).toMatchObject({ name: 'Old step' });

    view.component.reset();
    await waitFor(() => expect(view.getByRole('textbox', { name: /^Name/ })).toHaveProperty('value', 'Baseline'));
    const nextName = view.getByRole('textbox', { name: /^Name/ }) as HTMLInputElement;
    await fireEvent.input(nextName, { target: { value: 'New step' } });
    await fireEvent.click(view.getByRole('button', { name: 'Next' }));
    const description = await view.findByRole('textbox', { name: /^Description/ }) as HTMLInputElement;
    await fireEvent.input(description, { target: { value: 'New step description' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(2));
    expect(view.component.writeVariables(1)).toMatchObject({ name: 'New step' });

    view.component.resolveWrite(1, { name: 'Server new step', description: 'Server new step description' });
    await waitFor(() => expect(view.component.successCount()).toBe(1));
    expect(description.value).toBe('Server new step description');
    expect(view.component.navigationCount()).toBe(1);

    view.component.resolveWrite(0, { name: 'Server old step', description: 'Server old step description' });
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(0));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(description.value).toBe('Server new step description');
    expect(view.component.successCount()).toBe(1);
    expect(view.component.navigationCount()).toBe(1);
  });

  it('StepsForm reset rejects a late failure after returning to the first step', async () => {
    const view = render(Host, { kind: 'steps' });
    const name = await view.findByRole('textbox', { name: /^Name/ }) as HTMLInputElement;

    await fireEvent.input(name, { target: { value: 'Old failing step' } });
    await fireEvent.click(view.getByRole('button', { name: 'Next' }));
    await view.findByRole('textbox', { name: /^Description/ });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(1));

    view.component.reset();
    await waitFor(() => expect(view.queryByRole('textbox', { name: /^Name/ })).not.toBeNull());
    const freshName = view.getByRole('textbox', { name: /^Name/ }) as HTMLInputElement;
    await fireEvent.input(freshName, { target: { value: 'Fresh step after reset' } });
    view.component.rejectWrite(0, 'old step failure');
    await waitFor(() => expect(view.component.pendingWriteCount()).toBe(0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(view.queryByRole('alert')).toBeNull();
    expect(view.queryByText('old step failure')).toBeNull();
    expect(freshName.value).toBe('Fresh step after reset');
    expect(view.component.successCount()).toBe(0);
    expect(view.component.navigationCount()).toBe(0);
  });

  it('AutoForm reset is a no-op in read-only show mode', async () => {
    const view = render(Host, { kind: 'auto', mode: 'show' });
    const name = await view.findByRole('textbox', { name: /^Name/ }) as HTMLInputElement;
    expect(name.disabled).toBe(true);
    expect(name.value).toBe('Baseline');
    expect(view.queryByRole('button', { name: 'Save' })).toBeNull();

    view.component.reset();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(name.disabled).toBe(true);
    expect(name.value).toBe('Baseline');
    expect(view.component.successCount()).toBe(0);
    expect(view.component.navigationCount()).toBe(0);
  });

  it('AutoForm reset is a no-op when access control denies the form', async () => {
    const view = render(Host, { kind: 'auto', denied: true });
    const denied = await view.findByRole('alert');
    expect(denied.textContent).toContain('Operation failed');

    view.component.reset();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(view.getByRole('alert')).toBe(denied);
    expect(view.queryByRole('textbox', { name: /^Name/ })).toBeNull();
    expect(view.component.successCount()).toBe(0);
    expect(view.component.navigationCount()).toBe(0);
  });

  it('StepsForm reset is a no-op when access control denies the form', async () => {
    const view = render(Host, { kind: 'steps', denied: true });
    const denied = await view.findByRole('alert');
    expect(denied.textContent).toContain('Operation failed');

    view.component.reset();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(view.getByRole('alert')).toBe(denied);
    expect(view.queryByRole('textbox', { name: /^Name/ })).toBeNull();
    expect(view.component.successCount()).toBe(0);
    expect(view.component.navigationCount()).toBe(0);
  });
});
