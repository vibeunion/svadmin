import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CreateButton from './CreateButton.svelte';
import EditButton from './EditButton.svelte';
import ShowButton from './ShowButton.svelte';
import DeleteButton from './DeleteButton.svelte';
import ImportButton from './ImportButton.svelte';

vi.mock('@svadmin/core', () => ({
  useNavigation: () => ({
    create: vi.fn(),
    edit: vi.fn(),
    show: vi.fn(),
    clone: vi.fn(),
    list: vi.fn(),
  }),
  useCan: () => ({ allowed: true }),
  useTranslation: () => ({
    t: (key: string) => (key === 'common.create' ? 'Create' : key === 'common.edit' ? 'Edit' : key === 'common.detail' ? 'Detail' : key === 'common.delete' ? 'Delete' : key),
  }),
  useDelete: () => ({
    mutation: { mutateAsync: vi.fn() },
  }),
  useImport: () => ({
    inputProps: { type: 'file', accept: '.csv,.json' },
    handleChange: vi.fn(),
    isLoading: false,
  }),
  getResource: (res: string) => ({ name: res, label: res.toUpperCase() }),
}));

describe('Action Buttons label & custom text', () => {
  it('renders default translation text', () => {
    render(CreateButton, { resource: 'posts' });
    expect(screen.getByText('Create')).toBeDefined();
  });

  it('renders custom label when provided', () => {
    render(CreateButton, { resource: 'posts', label: 'New Order' });
    expect(screen.getByText('New Order')).toBeDefined();
  });

  it('renders custom label on EditButton', () => {
    render(EditButton, { resource: 'posts', recordItemId: '123', label: 'Modify Record' });
    expect(screen.getByText('Modify Record')).toBeDefined();
  });

  it('renders custom label on ShowButton', () => {
    render(ShowButton, { resource: 'posts', recordItemId: '123', label: 'View Inspection' });
    expect(screen.getByText('View Inspection')).toBeDefined();
  });

  it('renders custom label on DeleteButton', () => {
    render(DeleteButton, { resource: 'posts', recordItemId: '123', label: 'Remove Item' });
    expect(screen.getByText('Remove Item')).toBeDefined();
  });

  it('uses the label as the accessible name in icon-only mode', () => {
    render(CreateButton, { resource: 'posts', label: 'New Order', hideText: true });
    expect(screen.getByRole('button', { name: 'New Order' })).toBeDefined();
  });

  it('only accepts formats supported by useImport', () => {
    const view = render(ImportButton, { resource: 'posts' });
    expect(view.container.querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.csv,.json');
  });
});
