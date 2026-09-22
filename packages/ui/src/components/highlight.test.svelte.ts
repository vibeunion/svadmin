import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import HighlightText from './HighlightText.svelte';
import { escapeRegExp, splitHighlights } from './highlight.js';

afterEach(() => cleanup());

describe('splitHighlights', () => {
  it('returns a single non-match segment without query terms', () => {
    expect(splitHighlights('hello', undefined)).toEqual([{ text: 'hello', match: false }]);
    expect(splitHighlights('', 'x')).toEqual([]);
  });

  it('flags case-insensitive matches and merges overlaps', () => {
    expect(splitHighlights('Foo bar foo', 'foo')).toEqual([
      { text: 'Foo', match: true },
      { text: ' bar ', match: false },
      { text: 'foo', match: true },
    ]);

    const merged = splitHighlights('foobar', ['foo', 'oob']);
    expect(merged).toEqual([
      { text: 'foo', match: true },
      { text: 'bar', match: false },
    ]);
  });

  it('honours case sensitivity and whole-word matching', () => {
    expect(splitHighlights('Foo foo', 'foo', { caseSensitive: true })).toEqual([
      { text: 'Foo ', match: false },
      { text: 'foo', match: true },
    ]);
    expect(splitHighlights('cat category', 'cat', { wholeWord: true })).toEqual([
      { text: 'cat', match: true },
      { text: ' category', match: false },
    ]);
  });

  it('treats regex metacharacters literally', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
    expect(splitHighlights('cost is $5.00', '$5.00')).toEqual([
      { text: 'cost is ', match: false },
      { text: '$5.00', match: true },
    ]);
  });
});

describe('HighlightText', () => {
  it('renders matches inside semantic mark elements', () => {
    const view = render(HighlightText, { text: 'Inventory forecast', query: 'fore' });
    const marks = view.container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('fore');
    expect(view.container.textContent).toBe('Inventory forecast');
  });

  it('supports multiple terms and a custom highlight class', () => {
    const view = render(HighlightText, {
      text: 'alpha beta',
      query: ['alpha', 'beta'],
      highlightClass: 'custom-mark',
    });
    const marks = [...view.container.querySelectorAll('mark')];
    expect(marks.map((mark) => mark.textContent)).toEqual(['alpha', 'beta']);
    expect(marks.every((mark) => mark.classList.contains('custom-mark'))).toBe(true);
  });
});