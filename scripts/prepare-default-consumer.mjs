import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(join(tmpdir(), 'svadmin-default-consumer-'));
const project = join(temporary, 'app');
const run = (command, args, cwd = repository) => {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', timeout: 240_000,
    env: { ...process.env, BUN_INSTALL_CACHE_DIR: process.env.BUN_INSTALL_CACHE_DIR ?? join(tmpdir(), 'svadmin-consumer-cache') },
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
};
console.info(`Consumer directory: ${project}`);
run('bun', [join(repository, 'packages/create-svadmin/src/index.ts'), 'app',
  '--data-provider', 'simple-rest', '--auth-provider', 'none', '--no-install'], temporary);
const fixture = join(repository, 'scripts/fixtures/default-consumer');
renameSync(join(project, 'vite.config.ts'), join(project, 'vite.generated.config.ts'));
for (const file of ['BareApp.svelte', 'bare.ts']) copyFileSync(join(fixture, file), join(project, 'src', file));
for (const file of ['bare.html', 'vite.config.ts']) copyFileSync(join(fixture, file), join(project, file));
const manifestPath = join(project, 'package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const packages = new Map();
for (const entry of readdirSync(join(repository, 'packages'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  try {
    const directory = join(repository, 'packages', entry.name);
    const metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    packages.set(metadata.name, { directory, metadata });
  } catch { /* 非 package 目录不参与本地产物闭包。 */ }
}
const queue = Object.keys(manifest.dependencies).filter(name => packages.has(name));
const packed = new Set();
const receipts = [];
for (const name of queue) {
  if (packed.has(name)) continue;
  const { directory, metadata } = packages.get(name);
  const result = run('bun', ['pm', 'pack', '--quiet', '--ignore-scripts', '--destination', temporary], directory);
  const tarball = resolve(directory, result.split('\n').at(-1));
  manifest.dependencies[name] = `file:${tarball}`;
  packed.add(name);
  receipts.push({ name, version: metadata.version, tarball });
  for (const dependency of Object.keys({ ...metadata.dependencies, ...metadata.peerDependencies })) {
    if (packages.has(dependency) && !packed.has(dependency)) queue.push(dependency);
  }
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(temporary, 'receipt.json'), `${JSON.stringify({ project, packages: receipts }, null, 2)}\n`);
console.info(run('bun', ['install'], project));
let checkError;
try {
  console.info(run('bun', ['run', 'check'], project));
} catch (error) {
  checkError = error;
  writeFileSync(join(temporary, 'check.log'), String(error));
  console.error(`Strict consumer check failed; see ${join(temporary, 'check.log')}`);
}
console.info(run('bun', ['run', 'build'], project));
console.info(`Independent consumer built: ${project}`);
if (checkError) process.exitCode = 1;
