import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const currentDir = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(currentDir, path), 'utf8');

const appCss = read('app.css');
const recipes = read('recipes.ts');
const shellComponent = read('components/AppShellPage.svelte');
const pageSectionComponent = read('components/content/PageSection.svelte');

/** Stylesheets and inline component blocks that must stay token-only. */
const TOKEN_ONLY_SOURCES: readonly [string, string][] = [
  ['app-shell.css', read('app-shell.css')],
  ['page-chrome.css', read('page-chrome.css')],
  ['data-panel.css', read('data-panel.css')],
  ['components/AppShellPage.svelte', componentStyle(shellComponent)],
  ['components/content/PageSection.svelte', componentStyle(pageSectionComponent)],
];

/** Recipes that render page and panel chrome; their sizes must be token-bound. */
const TOKEN_BOUND_RECIPES = [
  'contentPageRecipeStyles',
  'contentHeaderRecipeStyles',
  'productSectionRecipeStyles',
  'productToolbarRecipeStyles',
  'productSettingsRecipeStyles',
  'surfaceTableRecipeStyles',
] as const;

// Structural geometry, not a design decision: hairlines, percentage fills,
// viewport units and focus/stacking-independent values.
const STRUCTURAL_LENGTHS = new Set(['0', '1px', '50%', '100%', '-100%', '100dvh', '85vw']);
const LENGTH = /(?<![\w.-])-?\d*\.?\d+(?:px|rem|em|%|vw|vh|dvh|ch|ex|pt)\b/g;
// Page width is the one deliberate exception: it must not follow the shell's
// width override, otherwise an explicit `width` prop would be silently ignored.
const RAW_LENGTH_ALLOWLIST: Record<string, readonly string[]> = {
  contentPageRecipeStyles: ['74rem', '92rem'],
};

// `m-0` and friends are structural resets; any non-zero step must be a token.
const BARE_SPACING = /(?<![-\w])(?:gap|space-[xy]|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(?:[1-9]\d*(?:\.\d+)?|0\.\d+)\b/;
const BARE_LENGTH = /(?<![\w-])-?\d*\.?\d+(?:rem|px|em)\b/g;
const BARE_TYPE = /(?<![-\w])(?:text-(?:xs|sm|base|lg|xl|2xl|3xl)|leading-(?:none|tight|snug|normal|relaxed|loose))\b/;

/** app.css plus the stylesheets it imports, so cross-file assertions see one surface. */
const surfaceCss = [
  appCss,
  read('app-shell.css'),
  read('page-chrome.css'),
  read('data-panel.css'),
].join('\n');

function componentStyle(source: string) {
  return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1] ?? '').join('\n');
}

/** Every declared custom property, so a reference can never point at a phantom token. */
function declaredCustomProperties() {
  const names = new Set<string>();
  postcss.parse(surfaceCss).walkDecls((decl) => {
    if (decl.prop.startsWith('--')) names.add(decl.prop);
  });
  return names;
}

function referencedCustomProperties(css: string) {
  const names = new Set<string>();
  postcss.parse(css).walkDecls((decl) => {
    for (const match of decl.value.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) names.add(match[1] as string);
  });
  return names;
}

function rawLengths(css: string) {
  const offenders: string[] = [];
  postcss.parse(css).walkDecls((decl) => {
    // A token definition is the one place a literal value is allowed to live.
    if (decl.prop.startsWith('--')) return;
    for (const match of decl.value.matchAll(LENGTH)) {
      const value = match[0].replace(/^\+/, '');
      if (!STRUCTURAL_LENGTHS.has(value)) offenders.push(`${decl.prop}: ${value} (${decl.value})`);
    }
  });
  return offenders;
}

function recipeBlock(name: string) {
  const start = recipes.indexOf(`const ${name} = tv({`);
  expect(start, `missing recipe ${name}`).toBeGreaterThanOrEqual(0);
  const end = recipes.indexOf('\n});', start);
  expect(end).toBeGreaterThan(start);
  return recipes.slice(start, end);
}

describe('size token contract', () => {
  it('keeps every non-structural length on a token', () => {
    for (const [label, css] of TOKEN_ONLY_SOURCES) {
      expect(rawLengths(css), label).toEqual([]);
    }
  });

  it('never hardcodes a color', () => {
    for (const [label, css] of TOKEN_ONLY_SOURCES) {
      expect(css, label).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css, label).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/);
      expect(css, label).not.toMatch(
        /\b(?:text|bg|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
      );
    }
  });

  it('references only tokens that app.css actually declares', () => {
    const declared = declaredCustomProperties();
    for (const [label, css] of TOKEN_ONLY_SOURCES) {
      for (const name of referencedCustomProperties(css)) {
        expect(declared.has(name), `${label}: undeclared token ${name}`).toBe(true);
      }
    }
  });

  it('declares the size rhythm the chrome and host overrides depend on', () => {
    const declared = declaredCustomProperties();
    for (const token of [
      '--svadmin-control-h-sm',
      '--svadmin-control-h',
      '--svadmin-control-h-lg',
      '--svadmin-row-h',
      '--svadmin-table-head-h',
      '--svadmin-table-state-min-h',
      '--svadmin-space-1',
      '--svadmin-space-6',
      '--svadmin-section-gap',
      '--svadmin-text-caption',
      '--svadmin-text-label',
      '--svadmin-text-body',
      '--svadmin-text-section',
      '--svadmin-text-title',
      '--svadmin-leading-tight',
      '--svadmin-leading-body',
      '--svadmin-focus-width',
      '--svadmin-measure',
      '--svadmin-shell-sidebar-w',
      '--svadmin-shell-sidebar-w-collapsed',
      '--svadmin-shell-topbar-h',
      '--svadmin-shell-gutter',
      '--svadmin-shell-max',
      '--svadmin-shell-aside-w',
      '--svadmin-chrome-basis',
    ]) {
      expect(declared.has(token), `missing ${token}`).toBe(true);
    }
  });

  it('declares each size token exactly once so no second density baseline appears', () => {
    const counts = new Map<string, number>();
    postcss.parse(appCss).walkDecls((decl) => {
      if (!/^--svadmin-(?:control-h|row-h|table-head-h|table-state-min-h|space-\d|text-(?:caption|label|body|section|title)|leading-|section-gap|measure|focus-width|shell-|chrome-)/.test(decl.prop)) return;
      counts.set(decl.prop, (counts.get(decl.prop) ?? 0) + 1);
    });
    expect([...counts].filter(([, count]) => count > 1).map(([name]) => name)).toEqual([]);
  });

  it('binds core controls and page chrome to the size tokens', () => {
    const heights = new Map<string, string>();
    const sizes = new Map<string, string>();
    postcss.parse(surfaceCss).walkRules((rule) => {
      const selector = rule.selector.trim();
      rule.walkDecls('height', (decl) => {
        heights.set(selector, decl.value);
      });
      rule.walkDecls('font-size', (decl) => {
        sizes.set(selector, decl.value);
      });
    });
    for (const selector of ['.svadmin-input', '.svadmin-select']) {
      expect(heights.get(selector), selector).toBe('var(--svadmin-control-h)');
    }
    expect(heights.get('.svadmin-table-head')).toBe('var(--svadmin-table-head-h)');
    expect(heights.get('.svadmin-table-cell')).toBe('var(--svadmin-row-h)');
    expect(sizes.get('.svadmin-table-head')).toBe('var(--svadmin-text-caption)');
    expect(sizes.get('.svadmin-table-cell')).toBe('var(--svadmin-text-label)');
    expect(sizes.get('.svadmin-page-header__title')).toBe('var(--svadmin-text-title)');
    expect(sizes.get('.svadmin-page-header__description')).toBe('var(--svadmin-text-body)');

    const toolbarVars = new Map<string, string>();
    postcss.parse(surfaceCss).walkRules((rule) => {
      if (!rule.selector.includes('.svadmin-filter-toolbar')) return;
      rule.walkDecls((decl) => {
        if (decl.prop.startsWith('--svadmin-filter-')) toolbarVars.set(decl.prop, decl.value);
      });
    });
    expect(toolbarVars.get('--svadmin-filter-control-height')).toBe('var(--svadmin-control-h)');
    expect(toolbarVars.get('--svadmin-filter-control-font')).toBe('var(--svadmin-text-body)');
  });

  it('keeps page and panel recipes free of bare type and spacing utilities', () => {
    for (const name of TOKEN_BOUND_RECIPES) {
      const block = recipeBlock(name);
      expect(block, `${name}: bare type utility`).not.toMatch(BARE_TYPE);
      expect(block, `${name}: bare spacing utility`).not.toMatch(BARE_SPACING);
      expect(block, `${name}: raw measure`).not.toMatch(/max-w-\[65ch\]/);
      const allowed = RAW_LENGTH_ALLOWLIST[name] ?? [];
      const raw = (block.match(BARE_LENGTH) ?? []).filter((value) => !allowed.includes(value));
      expect(raw, `${name}: raw length`).toEqual([]);
    }
  });

  it('routes recipe type sizes through the token layer', () => {
    expect(recipeBlock('contentHeaderRecipeStyles')).toContain('text-[length:var(--svadmin-text-title)]');
    expect(recipeBlock('productSectionRecipeStyles')).toContain('text-[length:var(--svadmin-text-section)]');
    expect(recipeBlock('productToolbarRecipeStyles')).toContain('gap-[var(--svadmin-space-3)]');
  });
});

describe('chrome class namespaces', () => {
  it('keeps shell, page chrome and panel classes inside their namespace', () => {
    const rules: [string, RegExp][] = [
      ['app-shell.css', /^svadmin-app-shell(?:__|$)/],
      ['data-panel.css', /^svadmin-data-panel(?:__|$)/],
      ['page-chrome.css', /^svadmin-(?:page-header|breadcrumbs|filter-toolbar)(?:__|$|-)/],
    ];
    for (const [file, pattern] of rules) {
      const css = read(file);
      const classes = new Set<string>();
      postcss.parse(css).walkRules((rule) => {
        for (const match of rule.selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(match[1] as string);
      });
      expect(classes.size, file).toBeGreaterThan(0);
      for (const name of classes) expect(pattern.test(name), `${file}: .${name}`).toBe(true);
    }
  });

  it('publishes every chrome stylesheet through the shipped app.css entry', () => {
    for (const file of ['app-shell.css', 'page-chrome.css', 'data-panel.css']) {
      expect(appCss).toContain(`@import "./${file}";`);
    }
  });
});