import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import RecordRowActions from './RecordRowActions.svelte';

vi.mock('@svadmin/core', async original => {
  const actual = await original<typeof import('@svadmin/core')>();
  return {
    ...actual,
    useCan: () => ({ allowed: true, isLoading: false }),
  };
});

vi.mock('@svadmin/core/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.edit': 'Edit',
      'common.quickEdit': 'Quick edit',
      'common.delete': 'Delete',
      'common.detail': 'Detail',
      'common.moreActions': 'More actions',
    }[key] ?? key),
  }),
}));

describe('RecordRowActions', () => {
  it('keeps Edit visible when delete is also allowed', async () => {
    const onEdit = vi.fn();
    const view = render(RecordRowActions, {
      resourceName: 'products',
      id: 1,
      canShow: true,
      canEdit: true,
      canDelete: true,
      onShow: vi.fn(),
      onEdit,
      onQuickEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    const edit = view.getByRole('button', { name: 'Edit' });
    expect(edit).toBeTruthy();
    expect(view.getByRole('button', { name: 'Detail' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'More actions' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Quick edit' })).toBeNull();

    await fireEvent.click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
