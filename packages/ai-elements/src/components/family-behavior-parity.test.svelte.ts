import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Host from './family-behavior-parity.test-host.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('official family behavior parity', () => {
  it('composes agent metadata, instructions, preferred schemas, and output', async () => {
    const onagentopenchange = vi.fn();
    render(Host, { onagentopenchange });

    expect(screen.getByTestId('agent-root').textContent).toContain('Inventory analyst');
    expect(screen.getByTestId('agent-root').textContent).toContain('svadmin-local');
    expect(screen.getByText('Only inspect the current tenant.')).not.toBeNull();
    expect(screen.getByText('type InventoryResult = { count: number };')).not.toBeNull();

    const tool = screen.getByText('Search inventory').closest('details');
    expect(tool?.hasAttribute('open')).toBe(false);
    await fireEvent.click(screen.getByText('Search inventory'));
    expect(tool?.hasAttribute('open')).toBe(true);
    expect(JSON.parse(tool?.querySelector('pre')?.textContent ?? '{}')).toMatchObject({
      type: 'object',
      properties: { query: { type: 'string' } },
    });
    expect(onagentopenchange).toHaveBeenLastCalledWith(true);
  });

  it('controls chain-of-thought disclosure and renders step metadata', async () => {
    const onchainopenchange = vi.fn();
    render(Host, { onchainopenchange });

    const chain = screen.getByTestId('chain-root');
    const trigger = screen.getByRole('button', { name: 'Chain of Thought' });
    expect(chain.getAttribute('data-state')).toBe('closed');
    expect(chain.textContent).not.toContain('Query the active warehouse');

    await fireEvent.click(trigger);
    expect(chain.getAttribute('data-state')).toBe('open');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(chain.querySelector('[data-status="active"]')?.textContent).toContain('Search inventory');
    expect(screen.getByText('warehouse-a')).not.toBeNull();
    expect(screen.getByText('Inventory chart')).not.toBeNull();
    expect(onchainopenchange).toHaveBeenCalledWith(true);
  });

  it('keeps commit actions from toggling disclosure and reports clipboard state', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const oncommitopenchange = vi.fn();
    const oncopycommit = vi.fn();
    render(Host, { oncommitopenchange, oncopycommit });

    const commit = screen.getByTestId('commit-root') as HTMLDetailsElement;
    expect(commit.open).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: 'Copy commit hash' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('abc1234'));
    expect(commit.open).toBe(false);
    expect(oncopycommit).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Copied commit hash' })).not.toBeNull();

    await vi.advanceTimersByTimeAsync(50);
    expect(screen.getByRole('button', { name: 'Copy commit hash' })).not.toBeNull();
    await fireEvent.click(screen.getByText('feat: add inventory report'));
    expect(commit.open).toBe(true);
    expect(oncommitopenchange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('M').getAttribute('data-status')).toBe('modified');
    expect(screen.getByText('3').textContent).toBe('3');
    expect(screen.queryByTestId('zero-additions')).toBeNull();
  });

  it('hides environment values, toggles visibility, and copies an export command', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const onenvironmentshowchange = vi.fn();
    const oncopyenvironment = vi.fn();
    render(Host, { onenvironmentshowchange, oncopyenvironment });

    const value = screen.getByTestId('environment-value');
    expect(value.textContent).toBe('*'.repeat(20));
    expect(value.textContent).not.toContain('super-secret');
    const toggle = screen.getByRole('switch', { name: 'Toggle value visibility' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    await fireEvent.click(toggle);
    expect(value.textContent).toBe('super-secret-value-that-must-stay-hidden');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(onenvironmentshowchange).toHaveBeenCalledWith(true);

    await fireEvent.click(screen.getByRole('button', { name: 'Copy export' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(
      'export API_TOKEN="super-secret-value-that-must-stay-hidden"',
    ));
    expect(oncopyenvironment).toHaveBeenCalledOnce();
  });

  it('renders package defaults, change metadata, versions, and dependencies', () => {
    render(Host);

    const packageRoot = screen.getByTestId('package-root');
    expect(packageRoot.textContent).toContain('@svadmin/ai-elements');
    expect(packageRoot.textContent).toContain('minor');
    expect(packageRoot.textContent).toContain('0.2.0');
    expect(packageRoot.textContent).toContain('0.3.0');
    expect(screen.getByText('streamdown-svelte')).not.toBeNull();
    expect(screen.getByText('Streaming Markdown renderer')).not.toBeNull();
    expect(screen.getByText('Dependencies')).not.toBeNull();
    expect(screen.getByText('svelte').parentElement?.textContent).toContain('^5.56.10');
  });

  it('reports clipboard failures without exposing or changing disclosure state', async () => {
    const error = new Error('Clipboard denied');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(error) },
    });
    const oncopyerror = vi.fn();
    render(Host, { oncopyerror });

    await fireEvent.click(screen.getByRole('button', { name: 'Copy commit hash' }));
    expect(oncopyerror).toHaveBeenCalledWith(error);
    expect((screen.getByTestId('commit-root') as HTMLDetailsElement).open).toBe(false);
  });
});
