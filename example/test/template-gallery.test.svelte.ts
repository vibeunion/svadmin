import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import TemplateGalleryPage from '../src/features/templates/TemplateGalleryPage.svelte';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

async function openTemplate(name: string): Promise<void> {
  await fireEvent.click(screen.getByRole('button', { name }));
}

describe('template gallery interactions', () => {
  it('filters the search table and recovers from an empty result', async () => {
    render(TemplateGalleryPage);
    await openTemplate('Search table');
    expect(screen.getByRole('status').textContent).toContain('3 matching records');
    expect(screen.getByRole('cell', { name: 'Northwind renewal' })).toBeTruthy();

    await fireEvent.input(screen.getByRole('textbox', { name: 'Search records' }), { target: { value: 'Harbor' } });
    expect(screen.getByRole('cell', { name: 'Harbor onboarding' })).toBeTruthy();
    expect(screen.queryByRole('cell', { name: 'Northwind renewal' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('1 matching records');

    await fireEvent.input(screen.getByRole('textbox', { name: 'Filter owner' }), { target: { value: 'Nobody' } });
    expect(screen.getByRole('status').textContent).toContain('No matching records');
    expect(screen.queryByRole('cell', { name: 'Harbor onboarding' })).toBeNull();

    await fireEvent.input(screen.getByRole('textbox', { name: 'Filter owner' }), { target: { value: '' } });
    expect(screen.getByRole('cell', { name: 'Harbor onboarding' })).toBeTruthy();
  });

  it('creates, saves a draft, and retries after a rejected publish', async () => {
    render(TemplateGalleryPage);
    await openTemplate('Search table');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search records' }), { target: { value: 'Northwind lab' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    const name = screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement;
    expect(name.value).toBe('Northwind lab');
    expect(screen.getByRole('status').textContent).toContain('Started a new workspace draft');

    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByRole('status').textContent).toContain('Draft saved locally for “Northwind lab”');

    await fireEvent.input(name, { target: { value: '   ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByRole('status').textContent).toContain('name is required');
    expect(screen.getByRole('button', { name: 'Retry publish' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement).value).toBe('   ');

    await fireEvent.input(screen.getByRole('textbox', { name: 'Workspace name' }), { target: { value: 'Northwind lab' } });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Simulate publish failure' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Retry publish' }));
    expect(screen.getByRole('status').textContent).toContain('demo service rejected');
    expect((screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement).value).toBe('Northwind lab');

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Simulate publish failure' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByRole('heading', { name: 'Workspace published' })).toBeTruthy();

    await openTemplate('Search table');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search records' }), { target: { value: 'Northwind lab' } });
    expect(screen.getByRole('cell', { name: 'Northwind lab' })).toBeTruthy();
  });
});
