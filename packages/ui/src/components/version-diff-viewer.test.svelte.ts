import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import VersionDiffViewer from './VersionDiffViewer.svelte';

describe('VersionDiffViewer Component', () => {
  it('renders field diffs between old and new values', () => {
    const oldValue = { title: 'Old Title', price: 100 };
    const newValue = { title: 'New Title', price: 100, category: 'Tech' };

    const view = render(VersionDiffViewer, {
      oldValue,
      newValue,
    });

    expect(view.container.textContent).toContain('Record Comparison');
    expect(view.container.textContent).toContain('Old Title');
    expect(view.container.textContent).toContain('New Title');
    expect(view.container.textContent).toContain('Tech');
  });

  it('exposes the active view mode through aria-pressed and hides decorative icons', async () => {
    const view = render(VersionDiffViewer, {
      oldValue: { title: 'Old Title' },
      newValue: { title: 'New Title' },
    });

    const splitButton = view.getByRole('button', { name: 'Side by Side' });
    const unifiedButton = view.getByRole('button', { name: 'Unified' });

    expect(splitButton.getAttribute('aria-pressed')).toBe('true');
    expect(unifiedButton.getAttribute('aria-pressed')).toBe('false');
    expect(splitButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(unifiedButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    await fireEvent.click(unifiedButton);

    expect(splitButton.getAttribute('aria-pressed')).toBe('false');
    expect(unifiedButton.getAttribute('aria-pressed')).toBe('true');
  });
});
