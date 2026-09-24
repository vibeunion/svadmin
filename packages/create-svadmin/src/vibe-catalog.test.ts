import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectVibePage, searchVibePages } from './vibe-catalog';
import { parseVibeArguments } from './vibe-command';

const root = resolve(import.meta.dir, '..');

describe('vibe reference catalog', () => {
  it('searches all terms across Chinese tags, IDs and component names', () => {
    expect(searchVibePages('审批').map(page => page.id)).toEqual(['approval']);
    expect(searchVibePages('  TABLE 客户 ').map(page => page.id)).toEqual(['list']);
    expect(searchVibePages('approval AutoForm').map(page => page.id)).toEqual(['approval']);
    expect(searchVibePages('unmatched')).toEqual([]);
    expect(searchVibePages('')).toHaveLength(6);
  });

  it('provides actual shipped sources and explicit reference boundaries for all pages', () => {
    for (const page of searchVibePages('')) {
      const context = inspectVibePage(root, page.id);
      expect(context.files[page.source]).toBe(readFileSync(resolve(root, 'blueprints/customer-workspace', page.source), 'utf8'));
      expect(context.files['src/features/customers/data.ts']).toContain('workspaceSettings');
      expect(context.files['src/demo/provider.ts']).toContain('createDemoProvider');
      expect(context.generatedFiles['src/design-selection.ts']?.presets).toContain('enterprise');
      expect(context.files['ARCHITECTURE.md']).toContain('not a security sandbox');
      expect(context.guidance['DESIGN.md']).toBe(readFileSync(resolve(root, 'guidance/DESIGN.md'), 'utf8'));
      expect(context.acceptance.commands).toContain('bun run check');
      expect(context.usage).toContain('not a standalone installable page');
      expect(context.previews.mobile).toBe(`previews/${page.id}-mobile.png`);
    }
    expect(() => inspectVibePage(root, '../../package.json')).toThrow('Unknown page');
    expect(() => inspectVibePage(root, 'toString')).toThrow('Unknown page');
  });

  it('strictly parses read-only commands', () => {
    expect(parseVibeArguments(['catalog', '--query', '审批'])).toEqual({ command: 'catalog', query: '审批' });
    expect(parseVibeArguments(['inspect', 'detail'])).toEqual({ command: 'inspect', page: 'detail' });
    for (const args of [
      ['catalog', '--query'], ['catalog', '--query', ' '], ['catalog', '--query', 'form', '--write'],
      ['inspect'], ['inspect', '--write'], ['inspect', 'form', '--write'],
    ]) expect(() => parseVibeArguments(args)).toThrow();
  });

  it('emits machine-readable CLI results and reports unknown pages as failure', () => {
    for (const args of [['catalog', '--query', '审批'], ['inspect', 'detail']]) {
      const result = Bun.spawnSync(['bun', resolve(root, 'src/index.ts'), 'vibe', ...args], { stdout: 'pipe', stderr: 'pipe' });
      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout.toString())).not.toThrow();
    }
    const result = Bun.spawnSync(['bun', resolve(root, 'src/index.ts'), 'vibe', 'inspect', 'missing'], { stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('Unknown page');
  }, 30_000);
});
