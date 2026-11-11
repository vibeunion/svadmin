import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import {
  useHotkeys,
  getRegisteredHotkeys,
  clearRegisteredHotkeys,
  isMac,
} from './useHotkeys.svelte.js';
import KeyboardShortcutsModal from './KeyboardShortcutsModal.svelte';

describe('useHotkeys and KeyboardShortcutsModal suite', () => {
  beforeEach(() => {
    clearRegisteredHotkeys();
  });

  it('triggers handler on matching modifier combo', () => {
    const handler = vi.fn();
    const mac = isMac();
    const { destroy } = useHotkeys('Mod+S', handler);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: mac,
      ctrlKey: !mac,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('registers in activeRegistry and removes on destroy', () => {
    expect(getRegisteredHotkeys().length).toBe(0);

    const { destroy } = useHotkeys('Mod+K', () => {}, {
      label: 'Open search',
      description: 'Search catalog',
      category: 'navigation',
    });

    const active = getRegisteredHotkeys();
    expect(active.length).toBe(1);
    expect(active[0]?.label).toBe('Open search');
    expect(active[0]?.category).toBe('navigation');

    destroy();
    expect(getRegisteredHotkeys().length).toBe(0);
  });

  it('suppresses bare single character shortcuts when input is focused', () => {
    const handler = vi.fn();
    const { destroy } = useHotkeys('j', handler, { enableOnInputs: false });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const eventInsideInput = new KeyboardEvent('keydown', {
      key: 'j',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(eventInsideInput, 'target', { value: input, writable: false });
    window.dispatchEvent(eventInsideInput);

    expect(handler).not.toHaveBeenCalled();

    const eventOutsideInput = new KeyboardEvent('keydown', {
      key: 'j',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(eventOutsideInput, 'target', { value: document.body, writable: false });
    window.dispatchEvent(eventOutsideInput);

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
    destroy();
  });

  it('allows modifier combinations even when input is focused', () => {
    const handler = vi.fn();
    const mac = isMac();
    const { destroy } = useHotkeys('Mod+S', handler);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: mac,
      ctrlKey: !mac,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: input, writable: false });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
    destroy();
  });

  it('renders KeyboardShortcutsModal with categorized items and search filter', async () => {
    const onAction = vi.fn();
    const view = render(KeyboardShortcutsModal, {
      open: true,
      title: '全局快捷键总览',
      shortcuts: [
        {
          id: 'custom-export',
          category: 'action',
          label: 'Export CSV Records',
          keys: ['Alt', 'E'],
          description: 'Export all filtered rows to Excel',
        },
      ],
      onAction,
    });

    expect(view.container.textContent).toContain('全局快捷键总览');
    expect(view.container.textContent).toContain('Export CSV Records');

    const searchInput = view.container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();
    if (searchInput) {
      await fireEvent.input(searchInput, { target: { value: 'Export' } });
      expect(view.container.textContent).toContain('Export CSV Records');
      expect(view.container.textContent).not.toContain('Next Table Row');
    }

    const exportRow = Array.from(view.container.querySelectorAll('[role="button"]')).find((el) =>
      el.textContent?.includes('Export CSV Records'),
    );
    expect(exportRow).toBeTruthy();
    if (exportRow) {
      await fireEvent.click(exportRow);
      expect(onAction).toHaveBeenCalledWith('custom-export');
    }
  });
});
