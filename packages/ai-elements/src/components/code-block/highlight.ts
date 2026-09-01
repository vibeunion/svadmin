import { createCodePlugin, type HighlightResult } from 'streamdown-svelte/plugins';

export interface CodeToken {
  content: string;
  color?: string;
  backgroundColor?: string;
  darkColor?: string;
  darkBackgroundColor?: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'none' | 'underline';
  darkFontStyle?: 'normal' | 'italic';
  darkFontWeight?: 'normal' | 'bold';
  darkTextDecoration?: 'none' | 'underline';
}

export interface TokenizedCode {
  tokens: CodeToken[][];
  fg: string;
  bg: string;
}

interface ShikiToken {
  content: string;
  color?: string;
  bgColor?: string;
  fontStyle?: number;
  htmlStyle?: Record<string, string>;
}

interface TokenRange {
  start: number;
  end: number;
  token: ShikiToken;
}

interface ThemeTokenStyle {
  color?: string;
  backgroundColor?: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'none' | 'underline';
}

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';
const codeHighlighter = createCodePlugin();
const tokensCache = new Map<string, TokenizedCode>();
const inFlight = new Map<string, Promise<void>>();
const subscribers = new Map<string, Set<(result: TokenizedCode) => void>>();

function getTokensCacheKey(code: string, language: string): string {
  return `${language.trim().toLowerCase() || 'text'}\0${code}`;
}

function toTokenRanges(tokens: ShikiToken[]): TokenRange[] {
  let offset = 0;
  const ranges: TokenRange[] = [];

  for (const token of tokens) {
    const start = offset;
    offset += token.content.length;
    if (offset > start) ranges.push({ start, end: offset, token });
  }

  return ranges;
}

function tokenAt(ranges: TokenRange[], offset: number): ShikiToken | undefined {
  return ranges.find((range) => range.start <= offset && offset < range.end)?.token;
}

function readStyle(token: ShikiToken | undefined): ThemeTokenStyle {
  if (!token) return {};

  const htmlStyle = token.htmlStyle ?? {};
  const fontStyle = htmlStyle['font-style'] === 'italic' || htmlStyle.fontStyle === 'italic'
    ? 'italic'
    : token.fontStyle && (token.fontStyle & 1) !== 0
      ? 'italic'
      : undefined;
  const fontWeight = htmlStyle['font-weight'] === 'bold' || htmlStyle.fontWeight === 'bold'
    ? 'bold'
    : token.fontStyle && (token.fontStyle & 2) !== 0
      ? 'bold'
      : undefined;
  const textDecoration = htmlStyle['text-decoration'] === 'underline' || htmlStyle.textDecoration === 'underline'
    ? 'underline'
    : token.fontStyle && (token.fontStyle & 4) !== 0
      ? 'underline'
      : undefined;

  return {
    color: htmlStyle.color ?? token.color,
    backgroundColor: htmlStyle['background-color'] ?? htmlStyle.backgroundColor ?? token.bgColor,
    fontStyle,
    fontWeight,
    textDecoration,
  };
}

function mergeLine(line: string, lightTokens: ShikiToken[], darkTokens: ShikiToken[]): CodeToken[] {
  if (line.length === 0) return [];

  const lightRanges = toTokenRanges(lightTokens);
  const darkRanges = toTokenRanges(darkTokens);
  const boundaries = new Set<number>([0, line.length]);

  for (const range of [...lightRanges, ...darkRanges]) {
    boundaries.add(Math.min(range.start, line.length));
    boundaries.add(Math.min(range.end, line.length));
  }

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right);
  const tokens: CodeToken[] = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const start = sortedBoundaries[index];
    const end = sortedBoundaries[index + 1];
    if (start === undefined || end === undefined || end <= start) continue;

    const light = readStyle(tokenAt(lightRanges, start));
    const dark = readStyle(tokenAt(darkRanges, start));
    tokens.push({
      content: line.slice(start, end),
      color: light.color,
      backgroundColor: light.backgroundColor,
      darkColor: dark.color,
      darkBackgroundColor: dark.backgroundColor,
      fontStyle: light.fontStyle,
      fontWeight: light.fontWeight,
      textDecoration: light.textDecoration,
      darkFontStyle: dark.fontStyle,
      darkFontWeight: dark.fontWeight,
      darkTextDecoration: dark.textDecoration,
    });
  }

  return tokens;
}

function mergeThemes(code: string, light: HighlightResult, dark: HighlightResult): TokenizedCode {
  const lines = code.split('\n');
  const lightLines = light.tokens as ShikiToken[][];
  const darkLines = dark.tokens as ShikiToken[][];

  return {
    bg: 'transparent',
    fg: 'inherit',
    tokens: lines.map((line, index) => mergeLine(line, lightLines[index] ?? [], darkLines[index] ?? [])),
  };
}

function requestTheme(code: string, language: string, theme: string): Promise<HighlightResult> {
  return new Promise((resolve) => {
    const result = codeHighlighter.highlight(
      { code, language, themes: [theme, theme] },
      resolve,
    );
    if (result) resolve(result);
  });
}

function notifySubscribers(cacheKey: string, result: TokenizedCode): void {
  const callbacks = subscribers.get(cacheKey);
  if (!callbacks) return;

  for (const callback of callbacks) callback(result);
  subscribers.delete(cacheKey);
}

function startHighlighting(code: string, language: string, cacheKey: string): void {
  if (inFlight.has(cacheKey)) return;

  const task = Promise.all([
    requestTheme(code, language, LIGHT_THEME),
    requestTheme(code, language, DARK_THEME),
  ])
    .then(([light, dark]) => {
      const result = mergeThemes(code, light, dark);
      tokensCache.set(cacheKey, result);
      notifySubscribers(cacheKey, result);
    })
    .catch((error: unknown) => {
      console.error('Failed to highlight code:', error);
      subscribers.delete(cacheKey);
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, task);
}

export function createRawTokens(code: string): TokenizedCode {
  return {
    bg: 'transparent',
    fg: 'inherit',
    tokens: code.split('\n').map((line) => line.length > 0 ? [{ content: line }] : []),
  };
}

/**
 * Returns a cached highlight synchronously or starts Shiki in the background.
 * The callback is notified once when the uncached result becomes available.
 */
export function highlightCode(
  code: string,
  language: string,
  callback?: (result: TokenizedCode) => void,
): TokenizedCode | null {
  const cacheKey = getTokensCacheKey(code, language);
  const cached = tokensCache.get(cacheKey);
  if (cached) return cached;

  if (callback) {
    const callbacks = subscribers.get(cacheKey) ?? new Set();
    callbacks.add(callback);
    subscribers.set(cacheKey, callbacks);
  }

  startHighlighting(code, language.trim().toLowerCase() || 'text', cacheKey);
  return null;
}
