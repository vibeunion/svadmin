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

  it('pages the local search records', async () => {
    render(TemplateGalleryPage);
    await openTemplate('Search table');
    expect(screen.getByRole('cell', { name: 'Northwind renewal' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Harbor onboarding' })).toBeTruthy();
    expect(screen.queryByRole('cell', { name: 'Atlas expansion' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Records next page' }));
    expect(screen.getByRole('cell', { name: 'Atlas expansion' })).toBeTruthy();
    expect(screen.queryByRole('cell', { name: 'Northwind renewal' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Records previous page' }));
    expect(screen.getByRole('cell', { name: 'Northwind renewal' })).toBeTruthy();
  });

  it('adds a card from the card list', async () => {
    render(TemplateGalleryPage);
    await openTemplate('Card list');
    expect(screen.queryByRole('heading', { name: 'Draft card 4' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: '+ Add card' }));
    expect(screen.getByRole('heading', { name: 'Draft card 4' })).toBeTruthy();
    expect(screen.getByText('Added from the card list. This demo keeps the card in local state.')).toBeTruthy();
  });

  it('publishes step-form fields and keeps them when the name is missing', async () => {
    render(TemplateGalleryPage);
    await openTemplate('Step form');
    await fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    await fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    await fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByRole('status').textContent).toContain('name is required');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: /Basics/ }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Step workspace name' }), { target: { value: 'Atlas lab' } });
    await fireEvent.input(screen.getByRole('textbox', { name: 'Step workspace owner' }), { target: { value: 'Mina Park' } });
    await fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Step team' }), { target: { value: 'Operations' } });
    await fireEvent.input(screen.getByRole('textbox', { name: 'Step visibility' }), { target: { value: 'Private' } });
    await fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText('Atlas lab')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByRole('heading', { name: 'Workspace published' })).toBeTruthy();
    expect(screen.getByText(/Atlas lab/)).toBeTruthy();

    await openTemplate('Search table');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search records' }), { target: { value: 'Atlas lab' } });
    expect(screen.getByRole('cell', { name: 'Atlas lab' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Mina Park' })).toBeTruthy();
  });
});
