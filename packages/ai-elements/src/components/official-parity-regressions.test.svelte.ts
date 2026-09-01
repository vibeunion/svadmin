import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OfficialParityRegressionsHost from './official-parity-regressions.test-host.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('official family parity regressions', () => {
  it('renders ANSI output safely and only exposes configured terminal controls', () => {
    const onterminalclear = vi.fn();
    render(OfficialParityRegressionsHost, { onterminalclear });

    const passive = screen.getByTestId('passive-terminal');
    expect(passive.textContent).toContain('Green output');
    expect(passive.textContent).not.toContain('\u001b[');
    expect(passive.querySelector('[data-ansi-foreground="green"]')).not.toBeNull();
    expect(passive.querySelector('input')).toBeNull();
    expect(passive.querySelector('button[aria-label="Clear terminal"]')).toBeNull();

    const interactive = screen.getByTestId('interactive-terminal');
    expect(interactive.querySelector('input[aria-label="Terminal command"]')).not.toBeNull();
    expect(interactive.querySelector('button[aria-label="Clear terminal"]')).not.toBeNull();
  });

  it('keeps stack traces closed by default and does not toggle from copy actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(OfficialParityRegressionsHost);

    const root = screen.getByTestId('stack-root');
    const header = screen.getByTestId('stack-header');
    expect(root.getAttribute('aria-label')).toBe('Application stack');
    expect(header.tagName).toBe('DIV');
    expect(header.getAttribute('role')).toBe('button');
    expect(screen.queryByText('/workspace/app.ts:12:8')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Copy stack trace' }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.queryByText('/workspace/app.ts:12:8')).toBeNull();

    await fireEvent.keyDown(header, { key: 'Enter' });
    expect(screen.getByText('/workspace/app.ts:12:8')).not.toBeNull();
  });

  it('maps sandbox statuses and provides complete tabs keyboard semantics', async () => {
    render(OfficialParityRegressionsHost);
    expect(screen.getByText('Completed')).not.toBeNull();

    const codeTab = screen.getByRole('tab', { name: 'Code' });
    const outputTab = screen.getByRole('tab', { name: 'Output' });
    codeTab.focus();
    await fireEvent.keyDown(codeTab, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(outputTab);
    expect(outputTab.getAttribute('aria-selected')).toBe('true');
    const panel = screen.getByRole('tabpanel');
    expect(outputTab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(outputTab.id);

    await fireEvent.keyDown(outputTab, { key: 'Home' });
    expect(document.activeElement).toBe(codeTab);
  });

  it('propagates compound file-tree selection and expansion changes', async () => {
    const onfileselect = vi.fn();
    const onfileexpandedchange = vi.fn();
    render(OfficialParityRegressionsHost, { onfileselect, onfileexpandedchange });

    expect(screen.getByTestId('compound-file-tree').getAttribute('role')).toBe('tree');
    expect(screen.getByTestId('custom-file-icon')).not.toBeNull();
    await fireEvent.click(screen.getByText('index.ts'));
    expect(onfileselect).toHaveBeenCalledWith('src/index.ts');

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse src' }));
    expect(onfileexpandedchange).toHaveBeenCalledOnce();
    expect([...onfileexpandedchange.mock.calls[0][0]]).toEqual([]);
  });

  it('opens context on hover and focus, then dismisses on leave, escape, and outside press', async () => {
    const oncontextopenchange = vi.fn();
    render(OfficialParityRegressionsHost, { oncontextopenchange });
    const root = screen.getByTestId('context-root');
    const trigger = screen.getByRole('button', { name: 'Context trigger' });

    await fireEvent.pointerEnter(root);
    expect(screen.getByText('Context details')).not.toBeNull();
    await fireEvent.pointerLeave(root);
    expect(screen.queryByText('Context details')).toBeNull();

    trigger.focus();
    await waitFor(() => expect(screen.getByText('Context details')).not.toBeNull());
    await fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByText('Context details')).toBeNull();

    await fireEvent.pointerEnter(root);
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByText('Context details')).toBeNull();
    expect(oncontextopenchange).toHaveBeenCalledWith(true);
    expect(oncontextopenchange).toHaveBeenCalledWith(false);
  });

  it('keeps original transcript indexes and activates only one overlapping id-less segment', () => {
    const { container } = render(OfficialParityRegressionsHost);
    const compound = screen.getByTestId('compound-transcript');
    const segments = compound.querySelectorAll<HTMLElement>('[data-slot="transcription-segment"]');
    expect(segments).toHaveLength(2);
    expect(segments[0]?.getAttribute('data-index')).toBe('0');
    expect(segments[1]?.getAttribute('data-index')).toBe('2');
    expect(compound.querySelectorAll('[data-active="true"]')).toHaveLength(1);
    expect(container.querySelector('[aria-label="No-id transcript"]')).not.toBeNull();
  });
});
