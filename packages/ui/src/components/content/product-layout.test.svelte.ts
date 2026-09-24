import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Host from './product-layout.test-host.svelte';
import StatusBadge from './StatusBadge.svelte';

afterEach(cleanup);
describe('Admin UI product layout compatibility', () => {
  it('keeps primary/summary snippets and omits the optional aside', () => {
    const view = render(Host, { secondary: false });
    expect(view.getByTestId('primary').textContent).toBe('Primary 0');
    expect(view.getByTestId('summary').textContent).toBe('Summary');
    expect(view.container.querySelector('aside')).toBeNull();
  });
  it.each(['primary-first', 'secondary-first'] as const)('preserves the requested %s DOM order', order => {
    const view = render(Host, { order });
    const nodes = view.container.querySelector('[data-svadmin-workspace-primary]')?.parentElement?.children;
    expect(nodes?.[0]?.tagName).toBe(order === 'secondary-first' ? 'ASIDE' : 'DIV');
    expect(view.container.querySelector('.consumer-layout')).not.toBeNull();
  });
  it.each([false, true])('keeps width and collapse bindings (%s)', collapsed => {
    const view = render(Host, { collapsed });
    const root = view.container.querySelector<HTMLElement>('[data-svadmin-workspace-layout]');
    expect(root?.style.getPropertyValue('--workspace-secondary-width')).toBe(collapsed ? '4rem' : '20rem');
    expect(root?.getAttribute('data-secondary-collapsed')).toBe(String(collapsed));
  });
  it('renders editable controls, explanations, explicit heading ID and consumer class hooks', () => {
    const view = render(Host);
    expect(view.getByRole('heading', { name: 'Settings' }).id).toBe('section-label');
    expect((view.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Preserved');
    expect(view.getByLabelText('Name', { selector: 'input' })).toBe(view.getByRole('textbox', { name: 'Name' }));
    expect(view.getByRole('group', { name: 'Name' }).contains(view.getByRole('textbox', { name: 'Name' }))).toBe(true);
    for (const hook of ['consumer-toolbar', 'consumer-heading', 'consumer-body', 'consumer-row', 'consumer-group']) expect(view.container.querySelector('.' + hook)).not.toBeNull();
    expect(view.getByText('Field description')).toBeTruthy();
    expect(view.getByText('Leading')).toBeTruthy();
    expect(view.getByText('Body')).toBeTruthy();
  });
  it('does not swallow callbacks in header, toolbar or settings action snippets', async () => {
    const view = render(Host);
    for (const name of ['Header action', 'Trailing action', 'Group action']) await fireEvent.click(view.getByRole('button', { name }));
    expect(view.getByTestId('primary').textContent).toBe('Primary 3');
  });
});


describe('StatusBadge public contract', () => {
  it.each(['success', 'warning', 'danger', 'info', 'neutral'] as const)('keeps the %s label and consumer class hook', status => {
    const view = render(StatusBadge, { status, class: 'consumer-status' });
    const badge = view.getByText(status);
    expect(badge.getAttribute('data-svadmin-status')).toBe(status);
    expect(badge.classList.contains('consumer-status')).toBe(true);
  });
  it('reacts to status changes without losing localized labels', async () => {
    const view = render(StatusBadge, { status: 'success', label: '已启用' });
    const before = view.getByText('已启用').className;
    await view.rerender({ status: 'warning', label: '待审核' });
    const badge = view.getByText('待审核');
    expect(badge.getAttribute('data-svadmin-status')).toBe('warning');
    expect(badge.className).not.toBe(before);
  });
});
