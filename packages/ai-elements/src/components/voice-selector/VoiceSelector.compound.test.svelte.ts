import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Host from './VoiceSelector.compound.test-host.svelte';

afterEach(cleanup);

describe('VoiceSelector compound API', () => {
  it('filters and selects a voice with accessible controls', async () => {
    render(Host); await fireEvent.click(screen.getByRole('button', { name: 'Select voice' }));
    const search = screen.getByRole('textbox', { name: 'Search voices' });
    await fireEvent.input(search, { target: { value: 'Verse' } });
    expect(screen.queryByRole('option', { name: 'Alloy' })).toBeNull();
    await fireEvent.click(screen.getByRole('option', { name: 'Verse' }));
    expect(screen.getByRole('status', { name: 'Selected compound voice' }).textContent).toBe('verse');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
