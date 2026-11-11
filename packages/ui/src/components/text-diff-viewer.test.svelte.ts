import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TextDiffViewer from './TextDiffViewer.svelte';

describe('TextDiffViewer Component', () => {
  const oldConfig = [
    'port = 3000',
    'timeout = 5000',
    'log_level = "info"',
    'enable_cache = false',
  ].join('\n');

  const newConfig = [
    'port = 3000',
    'timeout = 10000',
    'log_level = "info"',
    'enable_cache = true',
    'max_workers = 8',
  ].join('\n');

  it('renders split view with diff stats and baseline/current titles', () => {
    const { container } = render(TextDiffViewer, {
      props: {
        oldText: oldConfig,
        newText: newConfig,
        oldTitle: '生产配置 v1.0',
        newTitle: '生产配置 v1.1',
        viewMode: 'split',
      },
    });

    const root = container.querySelector('[data-svadmin-component="TextDiffViewer"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('生产配置 v1.0');
    expect(container.textContent).toContain('生产配置 v1.1');
    expect(container.textContent).toContain('3 新增');
    expect(container.textContent).toContain('2 删除');
    expect(container.textContent).toContain('2 未变更');
  });

  it('switches between split view and unified view', async () => {
    const { container } = render(TextDiffViewer, {
      props: {
        oldText: oldConfig,
        newText: newConfig,
        viewMode: 'split',
      },
    });

    const unifiedBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('单栏')
    );
    expect(unifiedBtn).toBeTruthy();

    if (unifiedBtn) {
      await fireEvent.click(unifiedBtn);
      // In unified mode, the split header titles ("变更前 (Baseline)") are hidden
      expect(container.textContent).not.toContain('变更前 (Baseline)');
      expect(container.textContent).toContain('max_workers = 8');
    }
  });

  it('collapses unchanged context lines when collapseUnchanged is toggled', async () => {
    const lines = Array.from({ length: 15 }, (_, idx) => `alpha-${idx + 1}-entry`);
    const oldTxt = lines.join('\n');
    const newLines = [...lines];
    newLines[12] = 'alpha-13-modified';
    const newTxt = newLines.join('\n');

    const { container } = render(TextDiffViewer, {
      props: {
        oldText: oldTxt,
        newText: newTxt,
        collapseUnchanged: false,
        contextLines: 2,
      },
    });

    expect(container.textContent).toContain('alpha-1-entry');
    const toggleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('只看差异')
    );
    expect(toggleBtn).toBeTruthy();

    if (toggleBtn) {
      await fireEvent.click(toggleBtn);
      expect(container.textContent).toContain('已折叠');
      expect(container.textContent).not.toContain('alpha-1-entry');
      expect(container.textContent).toContain('alpha-13-modified');
    }
  });
});
