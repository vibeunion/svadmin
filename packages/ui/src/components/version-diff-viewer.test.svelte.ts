import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
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
});
