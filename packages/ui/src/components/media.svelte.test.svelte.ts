import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import MediaHost from './media.test-host.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

type Listener = (event: { matches: boolean; media: string }) => void;

const registry = new Map<string, { matches: boolean; listeners: Set<Listener> }>();

function stateFor(query: string): { matches: boolean; listeners: Set<Listener> } {
  const existing = registry.get(query);
  if (existing) return existing;
  const state = { matches: false, listeners: new Set<Listener>() };
  registry.set(query, state);
  return state;
}

function installMatchMedia(): void {
  registry.clear();
  window.matchMedia = ((query: string) => {
    const state = stateFor(query);
    return {
      get matches() {
        return state.matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => state.listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => state.listeners.delete(listener),
      addListener: (listener: Listener) => state.listeners.add(listener),
      removeListener: (listener: Listener) => state.listeners.delete(listener),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

function setQuery(query: string, matches: boolean): void {
  const state = stateFor(query);
  state.matches = matches;
  for (const listener of state.listeners) listener({ matches, media: query });
}

afterEach(() => {
  cleanup();
  registry.clear();
});

describe('useMediaQuery / useDeviceDetect', () => {
  it('falls back to desktop when no query matches', async () => {
    installMatchMedia();
    const view = render(MediaHost);

    await waitFor(() => {
      expect(view.getByRole('status', { name: 'desktop' }).textContent).toBe('true');
    });
    expect(view.getByRole('status', { name: 'wide' }).textContent).toBe('false');
    expect(view.getByRole('status', { name: 'mobile' }).textContent).toBe('false');
    expect(view.getByRole('status', { name: 'touch' }).textContent).toBe('false');
  });

  it('reacts to media query changes and derives device flags', async () => {
    installMatchMedia();
    const view = render(MediaHost);
    const status = (name: string): string => requireValue(view.getByRole('status', { name })).textContent ?? '';

    await waitFor(() => expect(status('desktop')).toBe('true'));

    setQuery('(max-width: 640px)', true);
    setQuery('(hover: none), (pointer: coarse)', true);
    await waitFor(() => {
      expect(status('mobile')).toBe('true');
      expect(status('desktop')).toBe('false');
      expect(status('touch')).toBe('true');
    });

    setQuery('(min-width: 1000px)', true);
    await waitFor(() => expect(status('wide')).toBe('true'));
  });
});