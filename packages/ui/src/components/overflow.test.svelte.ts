import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import OverflowHarness from '../../test/fixtures/OverflowHarness.svelte';

afterEach(() => cleanup());

describe('Overflow', () => {
  it('renders the visible slice and reveals the rest in a menu', async () => {
    const view = render(OverflowHarness);
    expect(view.getByText('Alpha-0')).toBeTruthy();
    expect(view.getByText('Beta-1')).toBeTruthy();
    expect(view.queryByText('Gamma-2')).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: 'More' }));
    expect(await view.findByText('Gamma-2')).toBeTruthy();
    expect(view.getByText('Delta-3')).toBeTruthy();
  });
});
