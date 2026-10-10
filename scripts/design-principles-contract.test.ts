import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Admin UI design principles contract', () => {
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

  it('keeps ordinary pages comfortable and specialist density explicitly local', () => {
    const design = read('DESIGN.md');
    expect(design).toContain('Ordinary business pages default to `comfortable`');
    expect(design).toContain('Compact / Dense (explicit local opt-in)');
    expect(design).toContain('this guidance does not\n  introduce a universal 44px control height');
    expect(design).toContain('Restraint must not flatten the entire interface');
    expect(design).not.toContain('Use compact density for operational work');

    const english = read('docs/src/content/docs/guides/design-principles.md');
    const chinese = read('docs/src/content/docs/zh-cn/guides/design-principles.md');
    expect(english).toContain('Ordinary business pages default to `comfortable`');
    expect(english).toContain('explicit local opt-in');
    expect(english).toContain('Restraint does not mean every surface must');
    expect(chinese).toContain('普通业务页面默认 `comfortable`');
    expect(chinese).toContain('显式局部选择');
    expect(chinese).toContain('克制不等于');

    for (const path of [
      'docs/src/content/docs/components/content-components.md',
      'docs/src/content/docs/zh-cn/components/content-components.md',
    ]) {
      const content = read(path);
      expect(content).toContain('pageId="access-review" width="wide" density="comfortable"');
      expect(content).toContain('<ContentPageHeader density="comfortable"');
      expect(content).not.toContain('Choose `compact` for scan-heavy operational pages');
      expect(content).not.toContain('需要高频扫描的运营页面使用 `compact`');
    }
  });

  it('keeps the runnable workbench connected through the example resource contract', () => {
    expect(read('example/src/App.svelte')).toContain('DesignPrinciplesPage');
    expect(read('example/src/features/showcase/resources.ts')).toContain("name: 'design_principles'");
    expect(read('example/src/resources.ts')).toContain('...showcaseResources');
    expect(read('example/src/exampleMenuCatalog.ts')).toContain("'/design_principles'");
  });

  it('keeps documentation chrome aligned with the design contract', () => {
    const css = read('docs/src/styles/custom.css');
    expect(css).toContain('border-radius: 8px');
    expect(css).toContain('border: 1px solid');
    expect(css).not.toContain('!important');
    expect(css).not.toContain('letter-spacing: 0.02em');
  });

  it('keeps the reference stack and runtime entry points aligned', () => {
    const design = read('DESIGN.md');
    for (const reference of ['Stripe style prompt', 'Corporate-clean prompt', 'Fuse / Midone / Skote', 'Runtime integration map']) {
      expect(design).toContain(reference);
    }
    expect(read('packages/ui/src/default-theme.ts')).toContain("config?.layoutPreset ?? 'clean-flat'");
    expect(read('example/src/App.svelte')).not.toContain('themeConfig=');
    expect(read('packages/create-svadmin/template/src/App.svelte')).not.toContain('themeConfig=');
    expect(read('design/admin-ui/preview/Preview.svelte')).toContain('data-theme="stripe"');
    expect(read('design/admin-ui/preview/preview.css')).toContain('var(--svadmin-grid-size, 40px)');
  });
});
