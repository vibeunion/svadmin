import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetI18n } from '@svadmin/core/i18n';
import { resetAccessControlProvider } from '@svadmin/core/permissions';
import SurfaceEditPreview from './components/SurfaceEditPreview.svelte';
import type { SurfaceRevision } from './edits.js';

const policy = { resources: {} };
const catalog = { version: 'preview/v1', widgets: [] };
const revision: SurfaceRevision = { revision: 2, spec: {
  schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'preview', title: 'Current title',
  layout: { type: 'grid', columns: 12 }, widgets: [], dataSources: [],
} };
const proposal = { schemaVersion: 'surface-edit/v1', catalogVersion: catalog.version, surfaceId: 'preview',
  baseRevision: 2, operations: [{ op: 'set-title', value: 'Proposed title' }] };

afterEach(() => { resetI18n(); resetAccessControlProvider(); });

describe('SurfaceEditPreview', () => {
  test('does not apply a proposal automatically; preview and acceptance are separate user actions', async () => {
    const onApply = vi.fn();
    render(SurfaceEditPreview, { revision, proposal, policy, catalog, onApply, locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Current title' })).not.toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(screen.getByRole('heading', { name: 'Proposed title' })).not.toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Back to current' }));
    expect(screen.getByRole('heading', { name: 'Current title' })).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ revision: 3, spec: expect.objectContaining({ title: 'Proposed title' }) }));
    expect(revision.spec.title).toBe('Current title');
  });
  test('streamed or truncated input cannot change the current surface or call the host', async () => {
    const onApply = vi.fn();
    const view = render(SurfaceEditPreview, { revision, proposal: '{', streaming: true, policy, catalog, onApply, locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Current title' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Apply changes' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    await view.rerender({ proposal: '{', streaming: false });
    expect(screen.getByRole('alert').textContent).toContain('invalid_json');
    expect(onApply).not.toHaveBeenCalled();
  });
  test('rejects a stale proposal after the controlled revision changes', async () => {
    const onApply = vi.fn();
    const view = render(SurfaceEditPreview, { revision, proposal, policy, catalog, onApply, locale: 'en' });
    await view.rerender({ revision: { ...revision, revision: 3 } });
    expect(screen.getByRole('alert').textContent).toContain('revision_conflict');
    expect(screen.getByRole('button', { name: 'Apply changes' }).hasAttribute('disabled')).toBe(true);
    expect(onApply).not.toHaveBeenCalled();
  });
  test('reports failed host application without changing the revision and prevents duplicate pending applications', async () => {
    let reject: (error: Error) => void = () => { throw new Error('Not initialized'); };
    const onApply = vi.fn(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
    render(SurfaceEditPreview, { revision, proposal, policy, catalog, onApply, locale: 'en' });
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(screen.getByRole('button', { name: 'Applying changes' }).hasAttribute('disabled')).toBe(true);
    reject(new Error('Host declined'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Application failed'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(revision.revision).toBe(2);
  });
  test('supports local labels and refuses to apply without a trusted host handler', () => {
    render(SurfaceEditPreview, { revision, proposal, policy, catalog, locale: 'zh-CN', density: 'compact' });
    expect(screen.getByRole('button', { name: '确认应用' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('heading', { name: '界面修改提案' })).not.toBeNull();
  });
});
