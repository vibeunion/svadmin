import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import CodeField from './CodeField.svelte';
import PercentField from './PercentField.svelte';
import RatingField from './RatingField.svelte';

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');

function setClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalClipboard) {
    Object.defineProperty(globalThis.navigator, 'clipboard', originalClipboard);
  } else {
    Reflect.deleteProperty(globalThis.navigator, 'clipboard');
  }
});

describe('CodeField enterprise capabilities', () => {
  it('renders raw code and serializes objects', () => {
    const sql = render(CodeField, { value: 'SELECT * FROM users;', language: 'sql' });
    expect(sql.container.textContent).toContain('SELECT * FROM users;');
    expect(sql.container.textContent).toContain('SQL');
    sql.unmount();

    const json = render(CodeField, { value: { id: 1, name: 'Alice' }, language: 'json' });
    expect(json.container.textContent).toContain('"name": "Alice"');
  });

  it('reports copied state only after a successful clipboard write', async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard(writeText);
    const view = render(CodeField, { value: 'const answer = 42;' });

    const button = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy code"]');
    expect(button).not.toBeNull();
    if (button) await fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('const answer = 42;'));
    expect(button?.getAttribute('aria-label')).toBe('Copied!');
  });

  it('does not report copied state when the clipboard write fails', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('clipboard unavailable');
    });
    setClipboard(writeText);
    const view = render(CodeField, { value: 'const answer = 42;' });

    const button = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy code"]');
    expect(button).not.toBeNull();
    if (button) await fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('const answer = 42;'));
    expect(button?.getAttribute('aria-label')).toBe('Copy code');
  });

  it('renders fallback when value is empty', () => {
    const view = render(CodeField, { value: null, nullLabel: 'No Code' });
    expect(view.container.textContent).toContain('No Code');
  });
});

describe('PercentField enterprise capabilities', () => {
  it('formats percentage and ratio inputs', () => {
    const percentage = render(PercentField, { value: 75.678, precision: 1 });
    expect(percentage.container.textContent).toContain('75.7%');
    percentage.unmount();

    const ratio = render(PercentField, { value: 0.85, scale: '1', precision: 0 });
    expect(ratio.container.textContent).toContain('85%');
  });

  it('renders an accessible, clamped progress bar', () => {
    const view = render(PercentField, { value: 160, showProgress: true, tone: 'auto' });
    const progress = view.container.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('100');
    expect(view.container.querySelector('.bg-success')).not.toBeNull();
  });

  it('rejects blank and non-finite values', () => {
    const blank = render(PercentField, { value: '   ', nullLabel: 'N/A' });
    expect(blank.container.textContent).toContain('N/A');
    blank.unmount();

    const infinite = render(PercentField, { value: Number.POSITIVE_INFINITY, nullLabel: 'Invalid' });
    expect(infinite.container.textContent).toContain('Invalid');
  });

  it('bounds invalid precision without throwing', () => {
    const negative = render(PercentField, { value: 12.345, precision: -10 });
    expect(negative.container.textContent).toContain('12%');
    negative.unmount();

    const excessive = render(PercentField, { value: 12.345, precision: 1000 });
    expect(excessive.container.textContent).toContain('%');
  });
});

describe('RatingField enterprise capabilities', () => {
  it('renders a labeled star rating and numeric value', () => {
    const view = render(RatingField, { value: 4, max: 5, showValue: true });
    expect(view.container.textContent).toContain('4');
    expect(view.container.querySelectorAll('svg')).toHaveLength(5);
    expect(view.container.querySelector('[aria-label="4 out of 5"]')).not.toBeNull();
  });

  it('normalizes invalid or excessive maximum values', () => {
    const infinite = render(RatingField, { value: 4, max: Number.POSITIVE_INFINITY });
    expect(infinite.container.querySelectorAll('svg')).toHaveLength(5);
    infinite.unmount();

    const negative = render(RatingField, { value: 4, max: -2 });
    expect(negative.container.querySelectorAll('svg')).toHaveLength(1);
    expect(negative.container.querySelector('[aria-label="1 out of 1"]')).not.toBeNull();
  });

  it('rejects blank and non-finite values', () => {
    const blank = render(RatingField, { value: ' ', nullLabel: 'Unrated' });
    expect(blank.container.textContent).toContain('Unrated');
    blank.unmount();

    const infinite = render(RatingField, {
      value: Number.POSITIVE_INFINITY,
      nullLabel: 'Unrated',
    });
    expect(infinite.container.textContent).toContain('Unrated');
  });
});
