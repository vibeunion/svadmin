import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const components = ['PageHeader.svelte', 'Breadcrumbs.svelte', 'content/FilterToolbar.svelte'];
const css = readFileSync(join(sourceDir, 'page-chrome.css'), 'utf8');

describe('semantic page chrome', () => {
  it.each(components)('%s no longer depends on utility aliases or variant generators', (file) => {
    const source = readFileSync(join(sourceDir, 'components', file), 'utf8');
    expect(source).not.toContain('svadmin-u-');
    expect(source).not.toContain('tailwind-variants');
    expect(source).not.toContain('tailwind-merge');
  });

  it('ships native CSS with semantic colors and consumer-overridable layers', () => {
    expect(readFileSync(join(sourceDir, 'app.css'), 'utf8')).toContain('@import "./page-chrome.css";');
    const root = postcss.parse(css);
    const layers: string[] = [];
    root.walkAtRules((rule) => {
      expect(['layer', 'media']).toContain(rule.name);
      if (rule.name === 'layer') layers.push(rule.params);
    });
    expect(layers).toEqual(['components']);
    expect(css).not.toMatch(/#[a-f0-9]{3,8}\b|\b(?:rgb|hsl|oklch)\(/i);
    expect(css).toContain('var(--foreground)');
    expect(css).toContain('var(--muted-foreground)');
    expect(css).not.toContain('!important');
  });

  it('defines selectors for the owned semantic classes', () => {
    const classes = new Set<string>();
    postcss.parse(css).walkRules((rule) => {
      selectorParser((selectors) => {
        selectors.walkClasses((node) => { classes.add(node.value); });
      }).processSync(rule.selector);
    });
    for (const file of components) {
      const source = readFileSync(join(sourceDir, 'components', file), 'utf8');
      for (const [name] of source.matchAll(/svadmin-(?:page-header|filter-toolbar|breadcrumbs)(?:__[a-z-]+|--[a-z-]+)?/g)) {
        expect(classes.has(name), `${file}: missing ${name}`).toBe(true);
      }
    }
  });
});
