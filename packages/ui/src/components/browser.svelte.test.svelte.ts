import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BrowserHost from './browser.test-host.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function setup() {
  const view = render(BrowserHost);
  const status = (name: string): string =>
    requireValue(view.getByRole('status', { name })).textContent ?? '';
  return { view, status };
}

beforeEach(() => {
  const writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
});

afterEach(() => cleanup());

describe('useClipboard', () => {
  it('copies text and resets the feedback flag', async () => {
    const { view, status } = setup();
    expect(status('copied')).toBe('false');

    await fireEvent.click(view.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(status('copied')).toBe('true'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');

    await sleep(140);
    await waitFor(() => expect(status('copied')).toBe('false'));
  });
});

describe('useLocalStorage', () => {
  it('persists, restores, and clears a JSON value', async () => {
    const { view, status } = setup();
    expect(status('storage')).toBe('{"count":0}');

    await fireEvent.click(view.getByRole('button', { name: 'Increment' }));
    await waitFor(() => expect(status('storage')).toBe('{"count":1}'));
    expect(localStorage.getItem('svadmin-test-key')).toBe('{"count":1}');

    await fireEvent.click(view.getByRole('button', { name: 'Reset storage' }));
    await waitFor(() => expect(status('storage')).toBe('{"count":0}'));
    expect(localStorage.getItem('svadmin-test-key')).toBeNull();
  });

  it('accepts cross-tab storage events', async () => {
    const { status } = setup();
    const event = new Event('storage') as StorageEvent;
    Object.defineProperty(event, 'key', { value: 'svadmin-test-key' });
    Object.defineProperty(event, 'newValue', { value: JSON.stringify({ count: 9 }) });
    window.dispatchEvent(event);

    await waitFor(() => expect(status('storage')).toBe('{"count":9}'));
  });
});

describe('useDebouncedValue', () => {
  it('trails the source value by the delay', async () => {
    const { view, status } = setup();
    const input = requireValue(view.getByRole('textbox', { name: 'raw' })) as HTMLInputElement;

    await fireEvent.input(input, { target: { value: 'changed' } });
    expect(status('debounced')).toBe('initial');

    await waitFor(() => expect(status('debounced')).toBe('changed'), { timeout: 500 });
  });
});

describe('useInterval', () => {
  it('runs while a delay is set and stops when it is cleared', async () => {
    const { view, status } = setup();

    await fireEvent.click(view.getByRole('button', { name: 'Start interval' }));
    await waitFor(() => expect(Number(status('ticks'))).toBeGreaterThanOrEqual(2), { timeout: 500 });

    await fireEvent.click(view.getByRole('button', { name: 'Stop interval' }));
    const stopped = Number(status('ticks'));
    await sleep(80);
    expect(Number(status('ticks'))).toBe(stopped);
  });
});

describe('useEventListener', () => {
  it('listens on the resolved target', async () => {
    const { status } = setup();
    expect(status('events')).toBe('0');

    window.dispatchEvent(new Event('svadmin-test-event'));
    await waitFor(() => expect(status('events')).toBe('1'));
  });
});

describe('useOnClickOutside', () => {
  it('ignores presses inside the target and reports presses outside', async () => {
    const { view, status } = setup();
    const panel = view.getByTestId('panel');

    await fireEvent.pointerDown(panel);
    expect(status('outside')).toBe('0');

    await fireEvent.pointerDown(document.body);
    await waitFor(() => expect(status('outside')).toBe('1'));
  });
});

describe('useWindowSize', () => {
  it('tracks resize events', async () => {
    const { status } = setup();
    expect(status('size')).toBe('1024x768');

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => expect(status('size')).toBe('500x400'));
  });
});

describe('useSwipe', () => {
  it('recognises swipes above the threshold and ignores small movement', async () => {
    const { view, status } = setup();
    const target = view.getByTestId('swipe');

    await fireEvent.pointerDown(target, { clientX: 0, clientY: 0 });
    await fireEvent.pointerUp(target, { clientX: 80, clientY: 4 });
    expect(status('swipe')).toBe('right');

    await fireEvent.pointerDown(target, { clientX: 80, clientY: 0 });
    await fireEvent.pointerUp(target, { clientX: 10, clientY: 6 });
    expect(status('swipe')).toBe('left');

    await fireEvent.pointerDown(target, { clientX: 10, clientY: 10 });
    await fireEvent.pointerUp(target, { clientX: 12, clientY: 13 });
    expect(status('swipe')).toBe('left');

    await fireEvent.pointerDown(target, { clientX: 80, clientY: 80 });
    await fireEvent.pointerUp(target, { clientX: 74, clientY: 10 });
    expect(status('swipe')).toBe('up');

    await fireEvent.pointerDown(target, { clientX: 0, clientY: 0 });
    await fireEvent.pointerUp(target, { clientX: 6, clientY: 90 });
    expect(status('swipe')).toBe('down');
  });
});