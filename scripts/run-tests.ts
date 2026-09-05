import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const repositoryRoot = resolve(import.meta.dir, '..');
const packagesDirectory = join(repositoryRoot, 'packages');
const exampleDirectory = join(repositoryRoot, 'example');
const scriptsDirectory = join(repositoryRoot, 'scripts');
const workspaceTestRoots = [packagesDirectory, exampleDirectory, scriptsDirectory];
const ignoredDirectories = new Set(['node_modules', 'dist', '.svelte-kit']);
const nodeExecutable = process.env.NODE_BINARY ?? 'node';

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectFiles(join(directory, entry.name)));
      }
    } else if (entry.isFile()) {
      files.push(join(directory, entry.name));
    }
  }

  return files;
}

function run(command: string, args: string[], cwd: string): void {
  console.info(`Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function isTestFile(path: string): boolean {
  return /\.(?:test|spec)(?:\.[^.]+)?\.(?:[cm]?[jt]s|svelte\.ts)$/.test(path);
}

export function customVitestConfigTestPrefix(path: string): string | null {
  const fileName = basename(path);
  const configSuffix = '.config.ts';
  if (!fileName.endsWith(configSuffix)) {
    return null;
  }

  const testPrefix = fileName.slice(0, -configSuffix.length);
  return /\.test(?:[-.][^.]+)*$/.test(testPrefix) ? testPrefix : null;
}

export function testsForCustomVitestConfig(
  customConfig: string,
  packageTests: string[],
  packageDirectory: string,
): string[] {
  const testPrefix = customVitestConfigTestPrefix(customConfig);
  if (testPrefix === null) {
    throw new Error(`${customConfig} is not a custom Vitest config`);
  }

  const includedTests = packageTests
    .filter((testFile) => basename(testFile).startsWith(`${testPrefix}.`))
    .map((testFile) => relative(packageDirectory, testFile).split(sep).join('/'))
    .sort();

  if (includedTests.length === 0) {
    throw new Error(`${customConfig} does not match any Vitest test files`);
  }

  return includedTests;
}

function packageDirectoryFor(path: string): string {
  if (path === exampleDirectory || path.startsWith(`${exampleDirectory}${sep}`)) {
    return exampleDirectory;
  }
  const packageName = relative(packagesDirectory, path).split(sep)[0];
  return join(packagesDirectory, packageName);
}

async function main(): Promise<void> {
  const files = (await Promise.all(workspaceTestRoots.map(collectFiles))).flat();
  const testFiles = files.filter(isTestFile);
  const bunTestFiles: string[] = [];
  const vitestFilesByPackage = new Map<string, string[]>();

  for (const testFile of testFiles) {
    const source = await readFile(testFile, 'utf8');
    if (/from\s+['"]bun:test['"]/.test(source)) {
      bunTestFiles.push(relative(repositoryRoot, testFile));
    } else if (/from\s+['"]vitest['"]/.test(source)) {
      const packageDirectory = packageDirectoryFor(testFile);
      const packageTests = vitestFilesByPackage.get(packageDirectory) ?? [];
      packageTests.push(testFile);
      vitestFilesByPackage.set(packageDirectory, packageTests);
    }
  }

  if (bunTestFiles.length === 0) {
    throw new Error('No bun:test files were found');
  }

  bunTestFiles.sort();
  run(process.execPath, ['test', '--isolate', ...bunTestFiles], repositoryRoot);

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'svadmin-test-config-'));

  try {
    for (const [packageDirectory, packageTests] of [...vitestFilesByPackage.entries()].sort()) {
      const packageRequire = createRequire(join(packageDirectory, 'package.json'));
      const vitestCli = join(dirname(packageRequire.resolve('vitest')), 'vitest.mjs');
      const defaultConfig = join(packageDirectory, 'vitest.config.ts');
      run(nodeExecutable, [vitestCli, 'run', '--config', defaultConfig], packageDirectory);

      const customConfigs = files
        .filter(
          (file) =>
            file.startsWith(`${packageDirectory}${sep}`) && customVitestConfigTestPrefix(file) !== null,
        )
        .sort();
      for (const [index, customConfig] of customConfigs.entries()) {
        const includedTests = testsForCustomVitestConfig(customConfig, packageTests, packageDirectory);
        console.info(
          `Custom Vitest config: ${relative(repositoryRoot, customConfig).split(sep).join('/')} -> ${includedTests.join(', ')}`,
        );

        const wrapperConfig = join(temporaryDirectory, `vitest-${basename(packageDirectory)}-${index}.mjs`);
        await writeFile(
          wrapperConfig,
          `import config from ${JSON.stringify(pathToFileURL(customConfig).href)};\n` +
            `export default { ...config, test: { ...config.test, include: ${JSON.stringify(includedTests)} } };\n`,
        );
        run(nodeExecutable, [vitestCli, 'run', '--config', wrapperConfig], packageDirectory);
      }
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  await main();
}
