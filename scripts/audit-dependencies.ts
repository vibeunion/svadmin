import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import patches from './security-patches.json';

const repositoryRoot = resolve(import.meta.dir, '..');
const hash = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

function record(value: unknown): Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
  return value as Record<string, unknown>;
}

const json = (path: string): Record<string, unknown> =>
  record(JSON.parse(readFileSync(path, 'utf8')));

export function verifyPatchIntegrity(root: string): void {
  const manifest = json(join(root, 'package.json'));
  const lock = record(Bun.JSONC.parse(readFileSync(join(root, 'bun.lock'), 'utf8')));
  const lockedPackages = record(lock['packages']);

  for (const patch of patches) {
    const key = `${patch.name}@${patch.version}`;
    assert.equal(record(manifest['overrides'])[patch.name], patch.version, `${key}: override missing`);
    assert.equal(record(lock['overrides'])[patch.name], patch.version, `${key}: lock override missing`);
    assert.equal(record(manifest['patchedDependencies'])[key], patch.patch, `${key}: patch missing`);
    assert.equal(record(lock['patchedDependencies'])[key], patch.patch, `${key}: lock patch missing`);
    assert.equal(hash(join(root, patch.patch)), patch.sha256, `${key}: patch hash mismatch`);
    const instances = Object.entries(lockedPackages).filter(([, entry]) =>
      Array.isArray(entry) && typeof entry[0] === 'string' && entry[0].startsWith(`${patch.name}@`));
    assert.equal(instances.length, 1, `${key}: unexpected locked instances`);
    assert.equal(instances[0]?.[0], patch.name, `${key}: unexpected alias or nested instance`);
    const locked = instances[0]?.[1];
    assert(Array.isArray(locked), `${key}: missing lock entry`);
    assert.equal(locked[0], key, `${key}: locked version mismatch`);
  }

  // 检查所有实际安装实例，不能只信任根目录恰好存在的一份补丁。
  const found = new Set<string>();
  const visited = new Set<string>();
  function inspectModules(directory: string): void {
    if (!existsSync(directory)) return;
    const real = realpathSync(directory);
    if (visited.has(real)) return;
    visited.add(real);
    for (const entry of readdirSync(directory)) {
      if (entry.startsWith('.')) continue;
      const paths = entry.startsWith('@')
        ? readdirSync(join(directory, entry)).map(name => join(directory, entry, name))
        : [join(directory, entry)];
      for (const path of paths) {
        const metadataPath = join(path, 'package.json');
        if (!existsSync(metadataPath)) continue;
        const metadata = json(metadataPath);
        const patch = patches.find(item => item.name === metadata['name']);
        if (patch) {
          assert.equal(metadata['version'], patch.version, `${path}: installed version mismatch`);
          assert.equal(metadata['main'], 'index.js', `${path}: unexpected entry point`);
          assert.equal(metadata['exports'], undefined, `${path}: unexpected exports`);
          for (const [file, expected] of Object.entries(patch.files)) {
            assert.equal(hash(join(path, file)), expected, `${path}/${file}: source hash mismatch`);
          }
          found.add(patch.name);
        }
        inspectModules(join(path, 'node_modules'));
      }
    }
  }
  inspectModules(join(root, 'node_modules'));
  for (const workspace of Object.keys(record(lock['workspaces']))) {
    inspectModules(join(root, workspace, 'node_modules'));
  }
  for (const patch of patches) assert(found.has(patch.name), `${patch.name}: not installed`);
}

export interface Finding {
  name: string;
  url: string;
  title: string;
  severity: string;
  patched: boolean;
}

export function parseAudit(stdout: string, stderr: string, exitCode: number): Finding[] {
  assert(stderr.trim() === '', `Audit emitted diagnostics: ${stderr}`);
  assert(exitCode === 0 || exitCode === 1, `Unexpected audit exit ${exitCode}`);
  const report = record(JSON.parse(stdout));
  const findings: Finding[] = [];
  for (const [name, entries] of Object.entries(report)) {
    assert(Array.isArray(entries) && entries.length > 0, `Invalid audit list for ${name}`);
    for (const value of entries) {
      const item = record(value);
      const { id, url, title, severity, vulnerable_versions: affected } = item;
      assert(typeof id === 'number' && Number.isFinite(id), 'Missing advisory id');
      assert(typeof url === 'string' && url.startsWith('https://github.com/advisories/GHSA-'), 'Invalid advisory URL');
      assert(typeof title === 'string' && title.length > 0, 'Missing advisory title');
      assert(typeof affected === 'string', 'Missing affected range');
      assert(typeof severity === 'string' &&
        ['info', 'low', 'moderate', 'high', 'critical'].includes(severity), 'Invalid severity');
      findings.push({
        name, url, title, severity,
        patched: patches.some(patch => patch.name === name && patch.advisory === url &&
          patch.advisoryId === id && patch.affectedRange === affected && patch.severity === severity),
      });
    }
  }
  assert.equal(exitCode, findings.length > 0 ? 1 : 0, 'Audit result and exit disagree');
  return findings;
}

export async function withAuditSnapshot<T>(root: string, run: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), 'svadmin-audit-'));
  try {
    // 保留完整锁定依赖图，不让应用环境文件进入审计子进程。
    for (const file of ['package.json', 'bun.lock']) copyFileSync(join(root, file), join(directory, file));
    return await run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  verifyPatchIntegrity(repositoryRoot);
  const regression = Bun.spawnSync(
    [process.execPath, 'test', 'scripts/dependency-security.test.ts'],
    {
      cwd: repositoryRoot, stdout: 'inherit', stderr: 'inherit', timeout: 60_000,
      env: { ...process.env, SVADMIN_SECURITY_PACKAGE_ROOT: repositoryRoot },
    },
  );
  assert.equal(regression.exitCode, 0, 'Security patch regressions failed');
  const findings = await withAuditSnapshot(repositoryRoot, async directory => {
    const audit = Bun.spawn(
      [process.execPath, 'audit', '--json', '--registry', 'https://registry.npmjs.org'],
      { cwd: directory, stdout: 'pipe', stderr: 'pipe', timeout: 120_000 },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(audit.stdout).text(), new Response(audit.stderr).text(), audit.exited,
    ]);
    return parseAudit(stdout, stderr, exitCode);
  });
  for (const finding of findings) {
    console.info(`${finding.patched ? 'LOCAL PATCH VERIFIED (upstream advisory remains)' : 'UNRESOLVED'}: ` +
      `${finding.name} ${finding.severity}: ${finding.title}\n${finding.url}`);
    if (finding.patched) {
      const patch = patches.find(item => item.name === finding.name && item.advisory === finding.url);
      assert(patch);
      console.info(`${patch.name}@${patch.version}: ${patch.reason}\n` +
        `${patch.patch} sha256=${patch.sha256}; installed source hashes and regression tests verified.`);
    }
  }
  assert(!findings.some(finding => !finding.patched), 'Unresolved dependency advisories');
  console.info(`Dependency audit passed: ${findings.length} locally patched advisories; no unresolved findings.`);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
