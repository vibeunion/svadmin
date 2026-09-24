import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseVibeArguments, planVibeProject, writeVibeProject, type VibeFiles } from './vibe-command';
import { loadScaffoldManifest } from './project-manifest';
import { checkAdminManifest } from './scaffold-platform';
import { parseContractCreateInput, parseContractUpdateInput } from '@svadmin/core/resource-contract';
import { customers, followups, approvals } from '../blueprints/customer-workspace/src/features/customers/contracts';

const root = resolve(import.meta.dir, '..');
const manifest = loadScaffoldManifest(join(root, 'scaffold-manifest.json'));
const temporary: string[] = [];
function file(files: VibeFiles, name: string): string {
  const value = files[name];
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value.toString();
}
function temp() {
  const dir = mkdtempSync(join(tmpdir(), 'svadmin-vibe-'));
  temporary.push(dir);
  return dir;
}
afterEach(() => { for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('vibe starter', () => {
  it('parses strict, dry-run-first options', () => {
    expect(parseVibeArguments(['catalog'])).toEqual({ command: 'catalog' });
    expect(parseVibeArguments(['init', 'demo'])).toMatchObject({ preset: 'enterprise', write: false });
    expect(parseVibeArguments(['init', 'demo', '--preset', 'operations', '--write'])).toMatchObject({ preset: 'operations', write: true });
    for (const args of [[], ['init'], ['init', 'a', 'b'], ['catalog', '--write'], ['init', 'a', '--preset'], ['init', 'a', '--preset', 'oops'], ['init', 'a', '--force']]) {
      expect(() => parseVibeArguments(args)).toThrow();
    }
  });

  it('ships six concrete pages, three presets, skill and deterministic acceptance', () => {
    const files = planVibeProject(root, manifest, 'operations');
    const catalog = JSON.parse(file(files, 'svadmin.vibe.json'));
    expect(catalog.pages).toHaveLength(6);
    expect(catalog.presets).toHaveLength(3);
    for (const page of catalog.pages) {
      expect(files[page.source]).toBeDefined();
      for (const viewport of ['desktop', 'mobile']) {
        const image = files[`previews/${page.id}-${viewport}.png`];
        expect(Buffer.isBuffer(image)).toBe(true);
        if (Buffer.isBuffer(image)) expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      }
    }
    expect(files['src/design-selection.ts']).toContain("'operations'");
    expect(files['.agents/skills/svadmin-vibe/SKILL.md']).toContain('at most two');
    expect(files['vibe-skill.md']).toBeUndefined();
    expect(files['tests/workspace.spec.ts']).toContain("test('customer creation");
    expect(files['DESIGN.md']).toBe(readFileSync(join(root, 'guidance/DESIGN.md'), 'utf8'));
    expect(JSON.parse(file(files, 'tsconfig.json')).compilerOptions.skipLibCheck).toBe(false);
    expect(JSON.parse(file(files, 'package.json')).devDependencies.csstype).toBe('^3.2.3');
    for (const patch of Object.values(manifest.patchedDependencies ?? {})) expect(files[patch]).toBeDefined();
  });

  it('emits a doctor-compatible manifest from the actual resource definitions', () => {
    const directory = join(temp(), 'app');
    const files = planVibeProject(root, manifest, 'enterprise');
    writeVibeProject(directory, files);
    expect(checkAdminManifest(directory, JSON.parse(file(files, 'package.json')))).toEqual([]);
    const ai = JSON.parse(file(files, 'svadmin.ai.json'));
    expect(ai.resources.map((resource: { name: string }) => resource.name)).toEqual(['customers', 'followups', 'approvals', 'workspace_settings']);
    expect(ai.resources.find((resource: { name: string }) => resource.name === 'approvals').operations).not.toContain('create');
    expect(ai.resources.find((resource: { name: string }) => resource.name === 'workspace_settings').operations).toEqual([]);
    expect(ai.project.testCommand).toBe('bun run test:ui');
  });

  it('refuses existing directories and symlinks without touching existing files', () => {
    const directory = temp();
    writeFileSync(join(directory, 'keep.txt'), 'customer work');
    expect(() => writeVibeProject(directory, { 'keep.txt': 'changed' })).toThrow();
    const link = join(temp(), 'link');
    symlinkSync(directory, link);
    expect(() => writeVibeProject(link, { 'keep.txt': 'changed' })).toThrow();
    expect(readFileSync(join(directory, 'keep.txt'), 'utf8')).toBe('customer work');
    expect(existsSync(join(directory, 'package.json'))).toBe(false);
  });

  it('rejects escaping paths before creating a directory and preserves binary previews', () => {
    const directory = join(temp(), 'app');
    expect(() => writeVibeProject(directory, { '../escape.txt': 'bad' })).toThrow('escapes');
    expect(existsSync(directory)).toBe(false);
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    writeVibeProject(directory, { 'previews/test.png': image });
    expect(readFileSync(join(directory, 'previews/test.png'))).toEqual(image);
  });

  it('uses closed schemas and limits approval edits', () => {
    const input = { name: 'Test', contact: 'Lin', email: 'test@example.test', status: 'active' as const, owner: 'Chen', notes: '' };
    expect(parseContractCreateInput(customers, input)).toEqual(input);
    expect(() => parseContractCreateInput(customers, { ...input, role: 'admin' })).toThrow();
    expect(() => parseContractCreateInput(customers, { ...input, name: '' })).toThrow();
    expect(() => parseContractCreateInput(customers, { ...input, email: 'not an email' })).toThrow();
    expect(() => parseContractUpdateInput(customers, { email: 'not an email' })).toThrow();
    expect(() => parseContractCreateInput(followups, { customerId: '', summary: 'Call', owner: 'Lin', date: '2026-09-24' })).toThrow();
    expect(() => parseContractUpdateInput(followups, { date: 'not a date' })).toThrow();
    expect(parseContractUpdateInput(approvals, { status: 'approved', reason: 'Reviewed' })).toEqual({ status: 'approved', reason: 'Reviewed' });
    expect(() => parseContractUpdateInput(approvals, { applicant: 'Someone else' })).toThrow();
    expect(() => parseContractCreateInput(approvals, {})).toThrow();
  });

  it('runs the CLI with no implicit installation or write on a dry run', () => {
    const directory = join(temp(), 'app');
    const result = Bun.spawnSync(['bun', join(root, 'src/index.ts'), 'vibe', 'init', directory], { stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('Dry run only');
    expect(existsSync(directory)).toBe(false);
  }, 30_000);
});
