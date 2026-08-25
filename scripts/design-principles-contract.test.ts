import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Stripe-first design principles contract', () => {
  it('keeps repository and generated guidance synchronized', () => {
    expect(read('packages/create-svadmin/guidance/DESIGN.md')).toBe(read('DESIGN.md'));
    expect(read('DESIGN.md')).toContain('Clear by default');
    expect(read('DESIGN.md')).toContain('Accessible by construction');
    expect(read('DESIGN.md')).toContain('AI-ready and auditable');
  });

  it('ships bilingual principle and content-component documentation', () => {
    for (const path of [
      'docs/src/content/docs/guides/design-principles.md',
      'docs/src/content/docs/zh-cn/guides/design-principles.md',
      'docs/src/content/docs/components/content-components.md',
      'docs/src/content/docs/zh-cn/components/content-components.md',
      'docs/src/content/docs/zh-cn/components/ai-components.md',
    ]) expect(existsSync(resolve(root, path))).toBe(true);

    const sidebar = read('docs/astro.config.mjs');
    expect(sidebar).toContain("{ slug: 'guides/design-principles' }");
    expect(sidebar).toContain("{ slug: 'components/content-components' }");
  });

  it('keeps the runnable workbench connected through the example resource contract', () => {
    expect(read('example/src/App.svelte')).toContain('DesignPrinciplesPage');
    expect(read('example/src/resources.ts')).toContain("name: 'design_principles'");
    expect(read('example/src/exampleMenuCatalog.ts')).toContain("'/design_principles'");
  });

  it('keeps documentation chrome aligned with the design contract', () => {
    const css = read('docs/src/styles/custom.css');
    expect(css).toContain('border-radius: 8px');
    expect(css).toContain('border: 1px solid');
    expect(css).not.toContain('!important');
    expect(css).not.toContain('letter-spacing: 0.02em');
  });
});
