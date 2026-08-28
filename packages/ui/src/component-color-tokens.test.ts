import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(currentDir, 'components');

function collectSvelteFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSvelteFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.svelte')) {
      files.push(path);
    }
  }
  return files;
}

// Bare Tailwind palette utilities, e.g. text-green-500, dark:bg-emerald-600,
// fill-amber-500, ring-zinc-800/20. Variant prefixes (dark:, hover:, …) end in
// a word character or colon, so the leading \b still matches after them.
const PALETTE_UTILITY =
  /\b(?:text|bg|border|ring|fill|stroke|from|via|to|divide|outline|decoration|caret|accent|placeholder)-(?:green|emerald|teal|cyan|sky|amber|red|rose|orange|yellow|lime|blue|indigo|violet|fuchsia|purple|pink|zinc|gray|slate|neutral|stone)-(?:50|[1-9]00)\b/;

// Bare #hex colors. The lookbehind excludes HTML entities (`&#039;`) and
// non-color strings that embed `#` after a word character (`ShadowFox#7742`).
const BARE_HEX = /(?<![\w&])#[0-9a-fA-F]{3,8}\b/;

// Explicit hex exceptions. Keep this list as short as possible; every literal
// must still exist in its file, so stale allowances fail loudly.
const HEX_ALLOWLIST: { file: string; literal: string; reason: string }[] = [
  {
    file: 'FieldRenderer.svelte',
    literal: `'#000000'`,
    reason: 'fallback value for a native <input type="color"> picker, which requires a concrete hex (user data, not a theme color)',
  },
  {
    file: 'FieldRenderer.svelte',
    literal: `"#000000"`,
    reason: 'placeholder for the same native color picker input',
  },
  {
    file: 'Sidebar.svelte',
    literal: `'#6366f1'`,
    reason: 'fallback swatch for the runtime theme preview dot when no registered theme matches (documented in Sidebar.svelte)',
  },
];

function findViolations(): string[] {
  const violations: string[] = [];
  for (const path of collectSvelteFiles(componentsDir)) {
    const rel = relative(currentDir, path);
    let content = readFileSync(path, 'utf8');

    for (const allowance of HEX_ALLOWLIST.filter((a) => rel.endsWith(a.file))) {
      expect(content).toContain(allowance.literal);
      content = content.split(allowance.literal).join('');
    }

    content.split('\n').forEach((line, index) => {
      if (PALETTE_UTILITY.test(line)) {
        violations.push(`${rel}:${index + 1} bare palette utility: ${line.trim()}`);
      }
      if (BARE_HEX.test(line)) {
        violations.push(`${rel}:${index + 1} bare hex color: ${line.trim()}`);
      }
    });
  }
  return violations;
}

describe('component color tokens', () => {
  it('scans every .svelte component and finds files', () => {
    const files = collectSvelteFiles(componentsDir);
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.endsWith('AutoSaveIndicator.svelte'))).toBe(true);
  });

  it('forbids bare Tailwind palette utilities and bare hex colors in components', () => {
    // Semantic utilities (text-success, bg-warning/10, text-muted-foreground,
    // border, …) and chart-* decorative tokens are allowed, including behind
    // variant prefixes like dark:. Only raw palette colors are banned.
    expect(findViolations()).toEqual([]);
  });

  it('matches the historical violations this contract was written against', () => {
    const samples = [
      'text-green-500',
      'dark:text-green-400',
      'bg-emerald-500/10',
      'fill-amber-500',
      'border-zinc-800',
      'bg-rose-500',
      "color: '#10b981';",
    ];
    for (const sample of samples) {
      expect(PALETTE_UTILITY.test(sample) || BARE_HEX.test(sample)).toBe(true);
    }
  });

  it('keeps allowing semantic tokens, var() references, and non-color # strings', () => {
    const allowed = [
      'text-success bg-success/10 ring-success/20',
      'dark:bg-destructive text-warning-foreground',
      'bg-chart-1/10 text-chart-5',
      'text-muted-foreground border-border bg-card',
      'color: var(--success);',
      'currentColor',
      `.replace(/'/g, "&#039;")`,
      'ShadowFox#7742',
    ];
    for (const sample of allowed) {
      expect(PALETTE_UTILITY.test(sample)).toBe(false);
      expect(BARE_HEX.test(sample)).toBe(false);
    }
  });
});
