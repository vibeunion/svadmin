import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Host from './PromptInput.compound.test-host.svelte';

afterEach(cleanup);

describe('PromptInput compound API', () => {
  it('submits from Enter and composes action and select controls', async () => {
    render(Host);
    const textarea = screen.getByRole('textbox', { name: 'Compound prompt' });
    await fireEvent.input(textarea, { target: { value: 'Explain this' } });
    await fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(screen.getByRole('status', { name: 'Prompt result' }).textContent).toContain('Explain this|fast|');

    await fireEvent.click(screen.getByRole('button', { name: 'Open actions' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Browse' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Choose model' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Deep' }));
    expect(screen.getByRole('status', { name: 'Prompt result' }).textContent).toBe('Explain this|deep|browse');
  });
});
