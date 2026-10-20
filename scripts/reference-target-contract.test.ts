import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('reference target contract', () => {
  it('publishes one bilingual reference hierarchy', () => {
    for (const path of [
      'docs/src/content/docs/guides/reference-targets.md',
      'docs/src/content/docs/zh-cn/guides/reference-targets.md',
      'design/reference-kit/README.md',
      'design/reference-kit/manifest.json',
      'design/reference-kit/contract.json',
    ]) {
      expect(existsSync(resolve(root, path))).toBe(true);
    }

    for (const path of [
      'docs/src/content/docs/guides/reference-targets.md',
      'docs/src/content/docs/zh-cn/guides/reference-targets.md',
    ]) {
      const source = read(path);
      expect(source).toContain('DESIGN.md');
      expect(source).toContain('docs/ENTERPRISE_PRODUCT_SYSTEM.md');
      expect(source).toContain('design/reference-kit/');
      expect(source).toContain('docs/ui-state-matrix.md');
      expect(source).toContain('filtered-empty');
    }
    expect(read('docs/src/content/docs/guides/reference-targets.md')).toContain('does not prove');
    expect(read('docs/src/content/docs/zh-cn/guides/reference-targets.md')).toContain('不等于');
  });

  it('keeps runtime page states aligned with the documented target', () => {
    const pagePattern = read('packages/ui/src/components/PagePattern.svelte');
    const registry = read('packages/ui/src/component-registry.ts');
    const designContract = read('packages/ui/src/design-contract.ts');
    const uiReadme = read('packages/ui/README.md');

    for (const source of [pagePattern, registry, designContract, uiReadme]) {
      expect(source).toContain('filtered-empty');
    }
    expect(registry).toContain('states: ["ready", "loading", "empty", "filtered-empty", "error", "forbidden"]');
    expect(designContract).toContain("pageStates: ['ready', 'loading', 'empty', 'filtered-empty', 'error', 'forbidden']");
  });

  it('keeps the executable kit honest about its acceptance boundary', () => {
    const readme = read('design/reference-kit/README.md');
    const manifest = read('design/reference-kit/manifest.json');
    const contract = read('design/reference-kit/contract.json');

    expect(readme).toContain('不是三个页面的完整视觉设计稿');
    expect(readme).toContain('不能把上述 Figma 状态改成完成');
    expect(manifest).toContain('"status": "created-empty"');
    expect(contract).toContain('"applicationBrowserRegression": "not-run"');
  });

  it('keeps the repository audit aligned with state ownership rules', () => {
    const audit = read('scripts/ui-state-evidence-check.ts');
    const matrix = read('docs/ui-state-matrix.md');

    expect(audit).toContain('keep error recovery inside DataState');
    expect(audit).toContain('keep the primary empty state at the query boundary');
    expect(matrix).toContain('错误态的恢复入口由 `DataState` 的 `retry`');
    expect(matrix).toContain('工作台的主查询在 `loading`、');
  });
});
