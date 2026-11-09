import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyableText from './CopyableText.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CopyableText', () => {
  it('renders text with copy button and visual grounding', () => {
    const { container, getByRole } = render(CopyableText, {
      text: 'sk-proj-1234567890abcdef',
    });

    const root = container.querySelector('[data-svadmin-component="CopyableText"]');
    expect(root).not.toBeNull();
    expect(root?.textContent).toContain('sk-proj-1234567890abcdef');
    expect(getByRole('button')).not.toBeNull();
  });

  it('masks sensitive text while copying original content', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    const oncopied = vi.fn();
    const { container, getByRole } = render(CopyableText, {
      text: '1234567890123456',
      masked: true,
      maskVisibleLength: 4,
      oncopied,
    });

    const root = container.querySelector('[data-svadmin-component="CopyableText"]');
    expect(root?.textContent).toContain('1234••••••••3456');

    const button = getByRole('button');
    await fireEvent.click(button);

    expect(writeTextMock).toHaveBeenCalledWith('1234567890123456');
    expect(oncopied).toHaveBeenCalledWith('1234567890123456');
    expect(root?.getAttribute('data-copied')).toBe('true');
  });
});
