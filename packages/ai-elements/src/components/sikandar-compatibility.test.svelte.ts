import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Host from './sikandar-compatibility.test-host.svelte';

afterEach(cleanup);

describe('Sikandar-compatible Svelte composition extensions', () => {
  it('provides generic actions with semantic variants and accessible tooltips', async () => {
    render(Host);
    const action = screen.getByTestId('generic-action');
    expect(action.getAttribute('data-variant')).toBe('destructive');
    action.focus();
    await waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('Delete item'));
  });

  it('renders removable message attachments and opens image previews', async () => {
    render(Host);
    await fireEvent.click(screen.getByRole('button', { name: 'Preview diagram.png' }));
    expect(screen.getByRole('dialog', { name: 'diagram.png preview' }).hasAttribute('open')).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(document.querySelector('dialog[aria-label="diagram.png preview"]')?.hasAttribute('open')).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));
    expect(screen.getByTestId('message-removed').textContent).toBe('true');
  });

  it('renders the compound prompt attachment once and removes it through context', async () => {
    render(Host);
    expect(screen.getAllByText('report.pdf')).toHaveLength(1);
    expect(screen.getByText('Toolbar content')).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Remove report.pdf' }));
    expect(screen.queryByText('report.pdf')).toBeNull();
  });

  it('supports code aliases, line ranges, line numbers, and bindable overflow', async () => {
    const view = render(Host);
    await waitFor(() => expect(view.container.querySelector('pre')?.getAttribute('data-highlighted')).toBe('true'));
    expect(view.container.querySelector('span[data-highlighted="true"]')?.textContent).toContain('2const second = 2;');
    expect(screen.getByTestId('code-collapsed').textContent).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(screen.getByTestId('code-collapsed').textContent).toBe('false');
    expect(screen.getByRole('button', { name: 'Collapse' })).not.toBeNull();
  });
});
