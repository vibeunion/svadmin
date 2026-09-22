export interface HighlightSegment {
  text: string;
  match: boolean;
}

export interface SplitHighlightsOptions {
  caseSensitive?: boolean;
  /** Requires the match to be surrounded by non-word characters. */
  wholeWord?: boolean;
}

const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/gu;

export function escapeRegExp(value: string): string {
  return value.replace(REGEXP_SPECIALS, '\\$&');
}

function normalizeTerms(query: string | readonly string[] | undefined): string[] {
  if (query === undefined || query === null) return [];
  const list = typeof query === 'string' ? [query] : [...query];
  return list
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

/**
 * Splits `text` into ordered segments, flagging the ones that match any query
 * term. Overlapping matches are merged so the same characters are highlighted
 * once. Never returns HTML, so hosts can render segments safely.
 */
export function splitHighlights(
  text: string,
  query: string | readonly string[] | undefined,
  options: SplitHighlightsOptions = {},
): HighlightSegment[] {
  if (text.length === 0) return [];
  const terms = normalizeTerms(query);
  if (terms.length === 0) return [{ text, match: false }];

  const flags = options.caseSensitive ? 'gu' : 'giu';
  const wordBoundary = options.wholeWord ? '\\b' : '';
  const pattern = terms
    .sort((a, b) => b.length - a.length)
    .map((term) => `${wordBoundary}${escapeRegExp(term)}${wordBoundary}`)
    .join('|');

  let regex: RegExp;
  try {
    regex = new RegExp(`(${pattern})`, flags);
  } catch {
    return [{ text, match: false }];
  }

  const matches: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(regex)) {
    const start = match.index;
    const value = match[0];
    if (start === undefined || value.length === 0) continue;
    matches.push({ start, end: start + value.length });
  }
  if (matches.length === 0) return [{ text, match: false }];

  const merged: Array<{ start: number; end: number }> = [];
  for (const current of matches) {
    const previous = merged.at(-1);
    if (previous && current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const { start, end } of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}