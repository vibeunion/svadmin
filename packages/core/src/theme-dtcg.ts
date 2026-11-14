/**
 * Theme token ingestion (DTCG / Figma Variables) and contrast auditing.
 *
 * The token document in `color-scale.ts` is svadmin's own exchange format. This
 * module covers the inbound direction used by design tooling — DTCG design
 * tokens (`$value` / `$type`, nested groups, `{alias}` references) — plus a
 * WCAG contrast audit so a palette change can fail CI instead of shipping
 * unreadable text.
 */
import {
  deriveColorPreset,
  hexContrastRatio,
  oklchToHex,
  parseHex,
  type DerivedColorPreset,
} from './color-scale';

export interface DtcgIssue {
  path: string;
  reason: 'unsupported-type' | 'invalid-value' | 'unresolved-alias' | 'duplicate-variable';
}

export interface DtcgTheme {
  /** CSS variable → color value, ready for the theme applier. */
  light: Record<string, string>;
  dark: Record<string, string>;
  issues: DtcgIssue[];
}

export interface DtcgColorToken {
  $type: 'color';
  $value: string;
}

export interface DtcgThemeDocument {
  color: {
    light: Record<string, DtcgColorToken>;
    dark: Record<string, DtcgColorToken>;
  };
}

const MAX_DEPTH = 32;
const MAX_TOKENS = 2000;
const CSS_VAR_PATTERN = /^--[a-z0-9-]{1,64}$/i;
const COLOR_VALUE_PATTERN = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|oklch\(|rgb\(|hsl\(|color\()/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `color.primary.foreground` → `--primary-foreground` (leading segment dropped when it is `color`). */
export function dtcgPathToCssVar(path: string): string | undefined {
  const segments = path
    .split('.')
    .flatMap((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split(/[^a-z0-9]+/))
    .filter(Boolean);
  if (segments[0] === 'color' || segments[0] === 'colors') segments.shift();
  if (segments.length === 0) return undefined;
  const variable = `--${segments.join('-')}`;
  return CSS_VAR_PATTERN.test(variable) ? variable : undefined;
}

interface FlatToken {
  path: string;
  value: string;
  type?: string;
}

function flatten(document: Record<string, unknown>): { tokens: FlatToken[]; issues: DtcgIssue[] } {
  const tokens: FlatToken[] = [];
  const issues: DtcgIssue[] = [];
  let visited = 0;

  function visit(node: Record<string, unknown>, path: string[], depth: number): void {
    if (depth > MAX_DEPTH || ++visited > MAX_TOKENS * 8) return;
    if (typeof node['$value'] !== 'undefined') {
      const value = node['$value'];
      const type = typeof node['$type'] === 'string' ? node['$type'] : undefined;
      if (typeof value !== 'string') {
        issues.push({ path: path.join('.'), reason: 'invalid-value' });
        return;
      }
      tokens.push({ path: path.join('.'), value, ...(type ? { type } : {}) });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      if (!isRecord(child)) {
        issues.push({ path: [...path, key].join('.'), reason: 'invalid-value' });
        continue;
      }
      visit(child, [...path, key], depth + 1);
    }
  }

  for (const [key, child] of Object.entries(document)) {
    if (key.startsWith('$')) continue;
    if (!isRecord(child)) continue;
    visit(child, [key], 1);
  }
  return { tokens, issues };
}


/**
 * Parse a DTCG document into light/dark CSS variable maps.
 *
 * Modes are detected from a `light` / `dark` path segment anywhere below the
 * root, so both `{ light: {...}, dark: {...} }` and
 * `{ color: { light: {...}, dark: {...} } }` work. Tokens without a mode segment
 * apply to both modes. Aliases resolve against full paths.
 */
export function parseDtcgTheme(document: unknown): DtcgTheme {
  if (!isRecord(document)) throw new TypeError('DTCG document must be an object');
  const result: DtcgTheme = { light: {}, dark: {}, issues: [] };
  const { tokens, issues } = flatten(document);
  result.issues.push(...issues);
  const byPath = new Map(tokens.map((token) => [token.path.toLowerCase(), token]));
  const resolvedCache = new Map<string, string | undefined>();

  function resolve(token: FlatToken, depth = 0): string | undefined {
    if (depth > 16) return undefined;
    const alias = /^\{(.+)\}$/.exec(token.value.trim());
    if (!alias) return token.value;
    const key = token.path.toLowerCase();
    if (resolvedCache.has(key)) return resolvedCache.get(key);
    const target = byPath.get((alias[1] ?? '').toLowerCase());
    const value = target ? resolve(target, depth + 1) : undefined;
    if (value === undefined) result.issues.push({ path: token.path, reason: 'unresolved-alias' });
    resolvedCache.set(key, value);
    return value;
  }

  const seen = { light: new Set<string>(), dark: new Set<string>() };
  const unmodeed: Array<[string, string]> = [];
  for (const token of tokens) {
    const segments = token.path.split('.');
    const type = token.type?.toLowerCase();
    if (type !== undefined && type !== 'color' && type !== 'all') {
      result.issues.push({ path: token.path, reason: 'unsupported-type' });
      continue;
    }
    const value = resolve(token);
    if (value === undefined || !COLOR_VALUE_PATTERN.test(value.trim())) continue;
    const modeIndex = segments.findIndex((segment) => segment === 'light' || segment === 'dark');
    const variablePath = modeIndex === -1 ? segments : [...segments.slice(0, modeIndex), ...segments.slice(modeIndex + 1)];
    const variable = dtcgPathToCssVar(variablePath.join('.'));
    if (variable === undefined) continue;
    if (modeIndex === -1) {
      unmodeed.push([variable, value.trim()]);
      continue;
    }
    const mode = segments[modeIndex] as 'light' | 'dark';
    if (seen[mode].has(variable)) {
      result.issues.push({ path: token.path, reason: 'duplicate-variable' });
      continue;
    }
    seen[mode].add(variable);
    result[mode][variable] = value.trim();
  }
  // Un-moded tokens feed both modes unless the mode already declared the key.
  for (const [variable, value] of unmodeed) {
    for (const mode of ['light', 'dark'] as const) {
      if (seen[mode].has(variable)) continue;
      seen[mode].add(variable);
      result[mode][variable] = value;
    }
  }

  if (Object.keys(result.light).length === 0 && Object.keys(result.dark).length === 0) {
    throw new TypeError('DTCG document contains no color tokens');
  }
  if (Object.keys(result.dark).length === 0) result.dark = { ...result.light };
  if (Object.keys(result.light).length === 0) result.light = { ...result.dark };
  return result;
}

function cssVarToDtcgName(variable: string): string {
  if (!CSS_VAR_PATTERN.test(variable)) {
    throw new TypeError(`Invalid CSS variable name: ${variable}`);
  }
  const segments = variable.slice(2).split('-').filter(Boolean);
  if (segments.length === 0) throw new TypeError(`Invalid CSS variable name: ${variable}`);
  return segments.map((segment, index) => (
    index === 0 ? segment : `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}`
  )).join('');
}

function exportDtcgMode(tokens: Record<string, string>, mode: 'light' | 'dark'): Record<string, DtcgColorToken> {
  const result: Record<string, DtcgColorToken> = {};
  for (const [variable, rawValue] of Object.entries(tokens)) {
    const value = rawValue.trim();
    if (!COLOR_VALUE_PATTERN.test(value) || /[;{}]/.test(value)) {
      throw new TypeError(`${mode}.${variable} is not a portable color token value`);
    }
    const name = cssVarToDtcgName(variable);
    if (result[name] !== undefined) {
      throw new TypeError(`${mode} contains duplicate DTCG token name: ${name}`);
    }
    result[name] = { $type: 'color', $value: value };
  }
  if (Object.keys(result).length === 0) throw new TypeError(`${mode} must declare at least one color token`);
  return result;
}

/** Serialize CSS color variables into a portable W3C DTCG token document. */
export function exportDtcgTheme(input: Pick<DtcgTheme, 'light' | 'dark'>): DtcgThemeDocument {
  return {
    color: {
      light: exportDtcgMode(input.light, 'light'),
      dark: exportDtcgMode(input.dark, 'dark'),
    },
  };
}

/**
 * Build a complete preset from a DTCG document. Tokens present in the document
 * win; missing keys fall back to the generated palette for the same brand color.
 */
export function presetFromDtcg(input: {
  name: string;
  label?: string;
  color: string;
  document: unknown;
}): DerivedColorPreset {
  const generated = deriveColorPreset(input);
  const dtcg = parseDtcgTheme(input.document);
  return {
    name: generated.name,
    label: generated.label,
    color: generated.color,
    // Overlay wins key-by-key. Do not re-read `--primary`: indexed access is
    // `string | undefined` under noUncheckedIndexedAccess.
    light: { ...generated.light, ...dtcg.light },
    dark: { ...generated.dark, ...dtcg.dark },
  };
}

export interface ContrastCheck {
  pair: string;
  mode: 'light' | 'dark';
  foreground: string;
  background: string;
  ratio: number;
  aa: boolean;
  aaa: boolean;
}

const MODE_SURFACE = { light: '#FFFFFF', dark: '#111111' } as const;

function cssColorToHex(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    try {
      parseHex(trimmed);
      return trimmed.length === 4
        ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase()
        : trimmed.slice(0, 7).toUpperCase();
    } catch {
      return undefined;
    }
  }
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(trimmed);
  if (match) {
    return oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return undefined;
}

/**
 * Audit the token pairs that decide readability. AA is 4.5:1 for body text and
 * 3:1 for large text/graphics, matching WCAG 2.1.
 */
export function auditThemeContrast(preset: DerivedColorPreset): ContrastCheck[] {
  const checks: ContrastCheck[] = [];
  const pairs: Array<[string, string, string, number]> = [
    ['primary text', '--primary-foreground', '--primary', 4.5],
    ['primary hover text', '--primary-foreground', '--primary-5', 3],
    ['primary pressed text', '--primary-foreground', '--primary-7', 3],
    ['primary on surface', '--primary', '#surface', 3],
    ['sidebar primary text', '--sidebar-primary-foreground', '--sidebar-primary', 4.5],
    ['chart-1 on surface', '--chart-1', '#surface', 3],
    ['chart-2 on surface', '--chart-2', '#surface', 3],
    ['chart-3 on surface', '--chart-3', '#surface', 3],
    ['chart-4 on surface', '--chart-4', '#surface', 3],
    ['chart-5 on surface', '--chart-5', '#surface', 3],
  ];

  for (const mode of ['light', 'dark'] as const) {
    const tokens = preset[mode];
    const surface = MODE_SURFACE[mode];
    for (const [pair, foregroundKey, backgroundKey, minimum] of pairs) {
      const foreground = foregroundKey.startsWith('#') ? foregroundKey : tokens[foregroundKey];
      const background = backgroundKey === '#surface'
        ? surface
        : backgroundKey.startsWith('#') ? backgroundKey : tokens[backgroundKey];
      if (!foreground || !background) continue;
      const foregroundHex = cssColorToHex(foreground);
      const backgroundHex = cssColorToHex(background);
      if (!foregroundHex || !backgroundHex) continue;
      const ratio = Math.round(hexContrastRatio(foregroundHex, backgroundHex) * 100) / 100;
      checks.push({
        pair,
        mode,
        foreground: foregroundHex,
        background: backgroundHex,
        ratio,
        aa: ratio >= minimum,
        aaa: ratio >= (minimum === 4.5 ? 7 : 4.5),
      });
    }
  }
  return checks;
}

export function failingContrastChecks(checks: readonly ContrastCheck[]): ContrastCheck[] {
  return checks.filter((check) => !check.aa);
}

export function formatContrastReport(presetName: string, checks: readonly ContrastCheck[]): string {
  const rows = checks.map((check) => (
    `| ${check.mode} | ${check.pair} | ${check.foreground} on ${check.background} | ${check.ratio} | ${check.aa ? 'pass' : 'FAIL'} |`
  ));
  return [
    `# Theme contrast: ${presetName}`,
    '',
    '| Mode | Pair | Colors | Ratio | AA |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
