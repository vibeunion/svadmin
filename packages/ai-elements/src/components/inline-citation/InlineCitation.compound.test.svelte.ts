import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Host from './InlineCitation.compound.test-host.svelte';
import * as InlineCitationParts from './index.js';

afterEach(cleanup);

describe('InlineCitation compound API', () => {
  it('exports one canonical root component', () => {
    expect(InlineCitationParts.Root).toBe(InlineCitationParts.InlineCitation);
    expect(InlineCitationParts.default).toBe(InlineCitationParts.InlineCitation);
  });

  it('opens source details and navigates the carousel', async () => {
    render(Host); const trigger = screen.getByRole('button', { name: 'example.com +1' });
    await fireEvent.click(trigger); expect(screen.getByText('First quote')).not.toBeNull();
    expect(screen.getByText('1/2')).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Second quote')).not.toBeNull(); expect(screen.getByText('2/2')).not.toBeNull();
  });
});
