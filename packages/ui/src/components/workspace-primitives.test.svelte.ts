import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import WorkspacePrimitivesTestHost from './workspace-primitives.test-host.svelte';

describe('workspace primitives', () => {
  it('supports stage navigation, contextual action, split content, and inspector collapse', async () => {
    const page = render(WorkspacePrimitivesTestHost);

    expect(screen.getByText('Primary pane')).toBeTruthy();
    expect(screen.getByText('Secondary pane')).toBeTruthy();
    expect(screen.getByText('Inspector content')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Report: Awaiting review' }));
    expect(screen.getByRole('button', { name: 'Report: Awaiting review' }).getAttribute('aria-current')).toBe('step');

    await fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    expect(page.container.querySelector('[data-action-count]')?.textContent).toBe('1');

    await fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    expect(page.container.querySelector('[data-svadmin-workspace-layout]')?.getAttribute('data-secondary-collapsed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Open inspector' })).toBeTruthy();
  });
});
