import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompoundFoundationsTestHost from './compound-foundations.test-host.svelte';

afterEach(cleanup);

describe('compound foundation families', () => {
  it('renders artifact actions and toggles plan, task, and queue content', async () => {
    const onartifactaction = vi.fn();
    render(CompoundFoundationsTestHost, { onartifactaction });

    await fireEvent.click(screen.getByRole('button', { name: 'Publish artifact' }));
    expect(onartifactaction).toHaveBeenCalledOnce();
    expect(screen.getByText('Artifact body')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Toggle plan' }));
    expect(screen.queryByText('Plan body')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Toggle plan' }));
    expect(screen.getByText('Plan body')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Inspect workspace' }));
    expect(screen.queryByText('Read package manifests')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: /1 queued/ }));
    expect(screen.queryByText('Generate types')).toBeNull();
  });

  it('isolates file-tree instances and composes nested folders', async () => {
    const { container } = render(CompoundFoundationsTestHost);
    const nodeIds = Array.from(container.querySelectorAll<HTMLElement>('[id$="-node-file"]')).map((node) => node.id);
    expect(nodeIds).toHaveLength(2);
    expect(new Set(nodeIds).size).toBe(2);

    await fireEvent.click(screen.getByRole('button', { name: 'Expand src' }));
    expect(screen.getByRole('treeitem', { name: 'index.ts' })).not.toBeNull();
  });

  it('clamps queue progress for both visuals and accessible text', () => {
    render(CompoundFoundationsTestHost);
    expect(screen.getByLabelText('100% complete')).not.toBeNull();
  });
});
