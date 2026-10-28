import { fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import SavedViewsMenuHarness from '../../test/fixtures/SavedViewsMenuHarness.svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';

beforeEach(() => {
  localStorage.clear();
});

describe('SavedViewsMenu', () => {
  it('saves, applies and deletes a local view through the shared menu', async () => {
    const view = render(SavedViewsMenuHarness);
    const trigger = view.getByRole('button', { name: 'Views' });
    await fireEvent.click(trigger);

    const search = view.getByRole('textbox', { name: 'Harness search' });
    await fireEvent.input(search, { target: { value: 'review' } });
    await fireEvent.input(view.getByRole('textbox', { name: 'View name' }), { target: { value: 'Review queue' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));

    const option = view.getByRole('option', { name: 'Review queue' });
    expect(option).toBeTruthy();
    await fireEvent.input(search, { target: { value: 'changed' } });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: option.getAttribute('value') } });
    await waitFor(() => expect(view.getByTestId('applied-search').textContent).toBe('review'));

    await fireEvent.click(view.getByRole('button', { name: 'Delete Review queue' }));
    await waitFor(() => expect(view.queryByText('Review queue')).toBeNull());
  });

  it('keeps the menu closed while disabled', async () => {
    const view = render(SavedViewsMenuHarness, { disabled: true });
    const trigger = view.getByRole('button', { name: 'Views' });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(trigger);
    await waitFor(() => expect(view.queryByRole('textbox', { name: 'View name' })).toBeNull());
  });
});
