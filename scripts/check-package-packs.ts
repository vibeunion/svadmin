import { spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

interface PackFile {
  path: string;
}

interface PackResult {
  filename: string;
  files: PackFile[];
}

interface PackageExpectation {
  directory: string;
  name: string;
  requiredFiles: string[];
  contentAssertions?: Array<{
    path: string;
    includes?: string[];
    excludes?: string[];
  }>;
}

interface PackageManifest {
  name: string;
  main?: string;
  types?: string;
  svelte?: string;
  bin?: string | Record<string, string>;
  exports?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface WorkspacePackage {
  directory: string;
  manifest: PackageManifest;
}

const repositoryRoot = resolve(import.meta.dir, '..');
const packagesRoot = join(repositoryRoot, 'packages');
const tscPath = join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const pnpmVersion = '11.11.0';
const optionalMarkdownPeers = [
  'highlight.js',
  'isomorphic-dompurify',
  'marked',
  'marked-highlight',
] as const;

const expectations: PackageExpectation[] = [
  {
    directory: 'packages/ui',
    name: '@svadmin/ui',
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/components/AdminApp.svelte',
      'dist/components/AdminApp.svelte.d.ts',
      'dist/components/LazyPage.svelte',
      'dist/components/LazyPage.svelte.d.ts',
      'dist/app.css',
      'dist/app.theme.css',
    ],
    contentAssertions: [
      {
        path: 'dist/app.theme.css',
        includes: ['@theme', '@source "./components";'],
        excludes: ['@source "./src";'],
      },
      {
        path: 'dist/app.css',
        includes: [
          ':root',
          '.svadmin-theme',
          '--color-primary: var(--primary);',
          '@source "./components";',
        ],
        excludes: ['@theme', '@source "./src";'],
      },
    ],
  },
  {
    directory: 'packages/editor',
    name: '@svadmin/editor',
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/components/Editor.svelte',
      'dist/components/Editor.svelte.d.ts',
      'dist/styles/editor.css',
    ],
  },
  {
    directory: 'packages/lite',
    name: '@svadmin/lite',
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/components/LiteForm.svelte',
      'dist/components/LiteForm.svelte.d.ts',
      'dist/lite.css',
      'dist/enhance.js',
    ],
  },
  {
    directory: 'packages/auth-utils',
    name: '@svadmin/auth-utils',
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/password.js',
      'dist/password.d.ts',
      'dist/session.js',
      'dist/session.d.ts',
      'dist/totp.js',
      'dist/totp.d.ts',
    ],
  },
  {
    directory: 'packages/sso',
    name: '@svadmin/sso',
    requiredFiles: ['dist/index.js', 'dist/index.d.ts'],
  },
  {
    directory: 'packages/surface',
    name: '@svadmin/surface',
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/svelte.js',
      'dist/svelte.d.ts',
      'dist/components/SurfaceRenderer.svelte',
      'dist/components/SurfaceRenderer.svelte.d.ts',
      'compatibility.json',
      'README.md',
    ],
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parsePackResult(output: string, packageName: string): PackResult {
  const parsed: unknown = JSON.parse(output);
  assert(Array.isArray(parsed) && parsed.length === 1, `${packageName}: npm pack did not return one result`);

  const result: unknown = parsed[0];
  assert(typeof result === 'object' && result !== null, `${packageName}: invalid npm pack result`);

  const filename = Reflect.get(result, 'filename');
  const files = Reflect.get(result, 'files');
  assert(typeof filename === 'string', `${packageName}: npm pack result has no filename`);
  assert(Array.isArray(files), `${packageName}: npm pack result has no file list`);

  const parsedFiles = files.map((file: unknown) => {
    assert(typeof file === 'object' && file !== null, `${packageName}: invalid npm pack file entry`);
    const path = Reflect.get(file, 'path');
    assert(typeof path === 'string', `${packageName}: npm pack file entry has no path`);
    return { path };
  });

  return { filename, files: parsedFiles };
}

function collectExportTargets(value: unknown, targets: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith('./') && !value.includes('*')) targets.add(value.slice(2));
    return;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return;
  for (const nested of Object.values(value)) collectExportTargets(nested, targets);
}

function collectManifestTargets(manifest: PackageManifest): string[] {
  const targets = new Set<string>();
  for (const target of [manifest.main, manifest.types, manifest.svelte]) {
    if (typeof target === 'string' && !target.includes('*')) {
      targets.add(target.replace(/^\.\//, ''));
    }
  }

  if (typeof manifest.bin === 'string') {
    targets.add(manifest.bin.replace(/^\.\//, ''));
  } else if (manifest.bin) {
    for (const target of Object.values(manifest.bin)) {
      targets.add(target.replace(/^\.\//, ''));
    }
  }

  collectExportTargets(manifest.exports, targets);
  return [...targets].sort();
}

function assertUiDependencyContract(manifest: PackageManifest): void {
  const dependencies = manifest.dependencies ?? {};

  assert(
    dependencies['svelte-sonner'] === '^1.1.1',
    '@svadmin/ui: toast runtime must use the Svelte 5-compatible svelte-sonner@^1.1.1',
  );
  assert(
    !('sonner-svelte' in dependencies),
    '@svadmin/ui: deprecated Svelte 4-only sonner-svelte must not be published',
  );
  assert(
    !('cmdk-sv' in dependencies),
    '@svadmin/ui: cmdk-sv must not reintroduce the Svelte 4-only @melt-ui/svelte dependency chain',
  );
  assert(
    manifest.peerDependencies?.svelte === '^5.56.8',
    '@svadmin/ui: Svelte peer range must match the supported Svelte 5 release line',
  );
}

async function discoverWorkspacePackages(): Promise<WorkspacePackage[]> {
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const packages: WorkspacePackage[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = join(packagesRoot, entry.name);
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as PackageManifest;
      assert(typeof manifest.name === 'string' && manifest.name.length > 0, `${entry.name}: package name is missing`);
      packages.push({ directory, manifest });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  return packages.sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));
}

function run(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  assert(result.status === 0, `${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

async function verifyUiPeerTree(
  packDirectory: string,
  manifests: Map<string, PackageManifest>,
): Promise<string> {
  const uiManifest = manifests.get('@svadmin/ui');
  assert(uiManifest, '@svadmin/ui: missing manifest for peer dependency verification');

  const rootManifest = JSON.parse(
    await readFile(join(repositoryRoot, 'package.json'), 'utf8'),
  ) as { overrides?: Record<string, string> };
  const svelteVersion = rootManifest.overrides?.svelte;
  const queryVersion = uiManifest.peerDependencies?.['@tanstack/svelte-query'];
  assert(svelteVersion, 'root package.json: overrides.svelte is required for peer dependency verification');
  assert(queryVersion, '@svadmin/ui: @tanstack/svelte-query peer range is required');

  const consumerDirectory = join(packDirectory, 'peer-consumer');
  await mkdir(consumerDirectory, { recursive: true });
  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify({
      private: true,
      dependencies: {
        ...uiManifest.dependencies,
        '@tanstack/svelte-query': queryVersion,
        svelte: svelteVersion,
      },
    }, null, 2)}\n`,
  );

  run(
    'npm',
    ['install', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund'],
    consumerDirectory,
  );
  const dependencyTree = run('npm', ['ls', 'svelte', '--all'], consumerDirectory);
  const packageLock = await readFile(join(consumerDirectory, 'package-lock.json'), 'utf8');

  for (const forbiddenDependency of ['cmdk-sv', 'sonner-svelte', '@melt-ui/svelte']) {
    assert(
      !packageLock.includes(`node_modules/${forbiddenDependency}`),
      `@svadmin/ui: strict consumer unexpectedly installed ${forbiddenDependency}`,
    );
  }

  return dependencyTree;
}

async function verifyUiPnpmPeerTree(
  packDirectory: string,
  results: Map<string, PackResult>,
  manifests: Map<string, PackageManifest>,
): Promise<string> {
  const uiManifest = manifests.get('@svadmin/ui');
  const uiPack = results.get('@svadmin/ui');
  const corePack = results.get('@svadmin/core');
  assert(uiManifest, '@svadmin/ui: missing manifest for pnpm peer verification');
  assert(uiPack, '@svadmin/ui: missing tarball for pnpm peer verification');
  assert(corePack, '@svadmin/core: missing tarball for pnpm peer verification');

  const rootManifest = JSON.parse(
    await readFile(join(repositoryRoot, 'package.json'), 'utf8'),
  ) as { overrides?: Record<string, string> };
  const svelteVersion = rootManifest.overrides?.svelte;
  const viteVersion = rootManifest.overrides?.vite;
  const queryVersion = uiManifest.peerDependencies?.['@tanstack/svelte-query'];
  const sveltePluginVersion = uiManifest.devDependencies?.['@sveltejs/vite-plugin-svelte'];
  assert(svelteVersion, 'root package.json: overrides.svelte is required for pnpm verification');
  assert(viteVersion, 'root package.json: overrides.vite is required for pnpm verification');
  assert(queryVersion, '@svadmin/ui: @tanstack/svelte-query peer range is required for pnpm verification');
  assert(
    sveltePluginVersion,
    '@svadmin/ui: @sveltejs/vite-plugin-svelte dev dependency is required for pnpm verification',
  );

  const consumerDirectory = join(packDirectory, 'pnpm-peer-consumer');
  await mkdir(consumerDirectory, { recursive: true });
  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify({
      name: 'svadmin-pnpm-peer-consumer',
      private: true,
      packageManager: `pnpm@${pnpmVersion}`,
      dependencies: {
        '@svadmin/core': `file:${join(packDirectory, corePack.filename)}`,
        '@svadmin/ui': `file:${join(packDirectory, uiPack.filename)}`,
        '@tanstack/svelte-query': queryVersion,
        svelte: svelteVersion,
      },
      devDependencies: {
        '@sveltejs/vite-plugin-svelte': sveltePluginVersion,
        vite: viteVersion,
      },
    }, null, 2)}\n`,
  );

  run(
    'npx',
    [
      '--yes',
      `pnpm@${pnpmVersion}`,
      'install',
      '--strict-peer-dependencies',
      '--ignore-scripts',
      '--reporter',
      'append-only',
      '--store-dir',
      join(consumerDirectory, '.pnpm-store'),
    ],
    consumerDirectory,
  );

  const pnpmLock = await readFile(join(consumerDirectory, 'pnpm-lock.yaml'), 'utf8');
  for (const forbiddenDependency of ['cmdk-sv', 'sonner-svelte', '@melt-ui/svelte']) {
    assert(
      !pnpmLock.includes(forbiddenDependency),
      `@svadmin/ui: pnpm strict consumer unexpectedly installed ${forbiddenDependency}`,
    );
  }

  const installedUiManifest = JSON.parse(
    await readFile(join(consumerDirectory, 'node_modules', '@svadmin', 'ui', 'package.json'), 'utf8'),
  ) as PackageManifest;
  assert(
    installedUiManifest.name === '@svadmin/ui',
    '@svadmin/ui: pnpm strict consumer did not install the packed UI tarball',
  );
  const installedCoreManifest = JSON.parse(
    await readFile(join(consumerDirectory, 'node_modules', '@svadmin', 'core', 'package.json'), 'utf8'),
  ) as PackageManifest;
  assert(
    installedCoreManifest.name === '@svadmin/core',
    '@svadmin/core: pnpm strict consumer did not install the packed core tarball',
  );

  const virtualStoreEntries = await readdir(join(consumerDirectory, 'node_modules', '.pnpm'));
  for (const optionalPeer of optionalMarkdownPeers) {
    assert(
      !virtualStoreEntries.some((entry) => entry.startsWith(`${optionalPeer}@`)),
      `@svadmin/ui: pnpm strict consumer unexpectedly installed optional peer ${optionalPeer}`,
    );
  }
  const svelteVersions = new Set(
    virtualStoreEntries
      .map((entry) => /^svelte@([^_]+)(?:_|$)/.exec(entry)?.[1])
      .filter((version): version is string => version !== undefined),
  );
  assert(
    svelteVersions.size === 1,
    `@svadmin/ui: pnpm strict consumer resolved multiple Svelte versions: ${[...svelteVersions].join(', ')}`,
  );
  const [resolvedSvelteVersion] = svelteVersions;
  assert(
    resolvedSvelteVersion?.startsWith('5.'),
    `@svadmin/ui: pnpm strict consumer did not resolve Svelte 5: ${resolvedSvelteVersion ?? 'none'}`,
  );

  const dependencyTree = run(
    'npx',
    ['--yes', `pnpm@${pnpmVersion}`, 'list', 'svelte', '--depth', 'Infinity'],
    consumerDirectory,
  );

  const consumerEntry = join(consumerDirectory, 'markdown-import.ts');
  await writeFile(
    consumerEntry,
    `import { MarkdownRenderer } from '@svadmin/ui';\nconsole.info(typeof MarkdownRenderer);\n`,
  );
  const viteConfig = join(consumerDirectory, 'vite.config.mjs');
  await writeFile(
    viteConfig,
    `import { svelte } from '@sveltejs/vite-plugin-svelte';\nexport default { root: ${JSON.stringify(consumerDirectory)}, plugins: [svelte()], build: { lib: { entry: ${JSON.stringify(consumerEntry)}, formats: ['es'] } } };\n`,
  );
  const vitePath = join(repositoryRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const optionalPeerBuild = run(
    'node',
    [vitePath, 'build', '--config', viteConfig],
    consumerDirectory,
  );

  return `pnpm@${pnpmVersion} strict packed consumer passed\nforbidden dependencies absent: cmdk-sv, sonner-svelte, @melt-ui/svelte\noptional markdown peers absent: ${optionalMarkdownPeers.join(', ')}\n${optionalPeerBuild.trim()}\n${dependencyTree.trim()}\nresolved Svelte versions: ${resolvedSvelteVersion}`;
}

async function createConsumer(packDirectory: string, results: Map<string, PackResult>): Promise<string> {
  const consumerDirectory = join(packDirectory, 'consumer');
  const nodeModules = join(consumerDirectory, 'node_modules');
  await mkdir(nodeModules, { recursive: true });
  await writeFile(join(consumerDirectory, 'package.json'), '{"private":true,"type":"module"}\n');

  for (const expectation of expectations) {
    const result = results.get(expectation.name);
    assert(result, `${expectation.name}: missing pack result`);

    const packageDirectory = join(nodeModules, ...expectation.name.split('/'));
    await mkdir(packageDirectory, { recursive: true });
    run(
      'tar',
      ['-xzf', join(packDirectory, result.filename), '-C', packageDirectory, '--strip-components=1'],
      repositoryRoot,
    );
  }

  const coreStubDirectory = join(nodeModules, '@svadmin', 'core');
  await mkdir(coreStubDirectory, { recursive: true });
  await writeFile(
    join(coreStubDirectory, 'package.json'),
    JSON.stringify({
      name: '@svadmin/core',
      type: 'module',
      exports: {
        '.': {
          types: './index.d.ts',
          default: './index.js',
        },
      },
    }),
  );
  await writeFile(join(coreStubDirectory, 'index.js'), 'export {};\n');
  await writeFile(
    join(coreStubDirectory, 'index.d.ts'),
    `export interface AuthProvider {}
export interface Identity { [key: string]: unknown }
`,
  );

  const smokePath = join(consumerDirectory, 'smoke.mjs');
  await writeFile(
    smokePath,
    `import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const resolvable = [
  '@svadmin/ui',
  '@svadmin/ui/components/AdminApp.svelte',
  '@svadmin/ui/app.css',
  '@svadmin/ui/app.theme.css',
  '@svadmin/editor',
  '@svadmin/editor/components/Editor.svelte',
  '@svadmin/editor/editor.css',
  '@svadmin/lite',
  '@svadmin/lite/lite.css',
  '@svadmin/lite/enhance.js',
  '@svadmin/surface',
  '@svadmin/surface/svelte',
];

for (const specifier of resolvable) {
  const resolved = import.meta.resolve(specifier);
  await access(fileURLToPath(resolved));
  console.info('resolved', specifier, resolved);
}

const authUtils = await import('@svadmin/auth-utils');
const password = await import('@svadmin/auth-utils/password');
const session = await import('@svadmin/auth-utils/session');
const totp = await import('@svadmin/auth-utils/totp');
const sso = await import('@svadmin/sso');

if (typeof authUtils.hashPassword !== 'function' || typeof password.verifyPassword !== 'function') {
  throw new Error('@svadmin/auth-utils exports are incomplete');
}
if (typeof session.createSessionManager !== 'function' || typeof totp.generateTOTP !== 'function') {
  throw new Error('@svadmin/auth-utils subpath exports are incomplete');
}
if (typeof sso.createSSOAuthProvider !== 'function' || typeof sso.generateChallenge !== 'function') {
  throw new Error('@svadmin/sso exports are incomplete');
}
if (typeof sso.SSOAuthError !== 'function') {
  throw new Error('@svadmin/sso error export is missing');
}

const ssoStorageValues = new Map();
const ssoProvider = sso.createSSOAuthProvider({
  issuer: 'https://idp.example',
  clientId: 'pack-check',
  redirectUri: 'https://app.example/callback',
  autoRefresh: false,
  storage: {
    getItem: (key) => ssoStorageValues.get(key) ?? null,
    setItem: (key, value) => { ssoStorageValues.set(key, value); },
    removeItem: (key) => { ssoStorageValues.delete(key); },
  },
});
for (const method of [
  'getSession',
  'refreshSession',
  'getAccessToken',
  'onAuthStateChange',
  'createAuthenticatedFetch',
  'destroy',
]) {
  if (typeof ssoProvider[method] !== 'function') {
    throw new Error(\`@svadmin/sso provider is missing \${method}\`);
  }
}
ssoProvider.destroy();

console.info('consumer imports passed');
`,
  );

  const runtimeOutput = run('node', [smokePath], consumerDirectory);

  await writeFile(
    join(consumerDirectory, 'smoke.ts'),
    `import { createSessionManager } from '@svadmin/auth-utils';
import type { PasswordOptions } from '@svadmin/auth-utils/password';
import { createGoogleAuth, SSOAuthError } from '@svadmin/sso';
import type {
  GetAccessTokenOptions,
  RefreshLock,
  SSOAuthProvider,
  SSOConfig,
  SSOSession,
} from '@svadmin/sso';

type PublishedTypes = PasswordOptions | SSOConfig | SSOSession | GetAccessTokenOptions;

void createSessionManager;
const provider: SSOAuthProvider = createGoogleAuth('pack-check', {
  redirectUri: 'https://app.example/callback',
  autoRefresh: false,
});
const refreshLock: RefreshLock = {
  request: async (_name, operation) => operation(),
};
const authError = new SSOAuthError('pack check', 401);
const publishedTypes: PublishedTypes | undefined = undefined;
void provider;
void refreshLock;
void authError;
void publishedTypes;
`,
  );
  await writeFile(
    join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      include: ['smoke.ts'],
    }),
  );
  run('node', [tscPath, '--project', join(consumerDirectory, 'tsconfig.json')], consumerDirectory);

  return `${runtimeOutput.trim()}\nconsumer type imports passed\n`;
}

interface SurfaceCompatibility {
  minimumSupported: {
    '@svadmin/core': string;
    '@svadmin/ui': string;
    svelte: string;
  };
}

async function verifySurfaceCompatibility(
  packDirectory: string,
  results: Map<string, PackResult>,
  manifests: Map<string, PackageManifest>,
): Promise<string> {
  const surfacePack = results.get('@svadmin/surface');
  const corePack = results.get('@svadmin/core');
  const uiPack = results.get('@svadmin/ui');
  const uiManifest = manifests.get('@svadmin/ui');
  assert(surfacePack, '@svadmin/surface: missing tarball for compatibility verification');
  assert(corePack, '@svadmin/core: missing tarball for Surface compatibility verification');
  assert(uiPack, '@svadmin/ui: missing tarball for Surface compatibility verification');
  assert(uiManifest, '@svadmin/ui: missing manifest for Surface compatibility verification');

  const compatibility = JSON.parse(await readFile(
    join(repositoryRoot, 'packages', 'surface', 'compatibility.json'),
    'utf8',
  )) as SurfaceCompatibility;
  const rootManifest = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8')) as {
    overrides?: Record<string, string>;
  };
  const workspaceSvelte = rootManifest.overrides?.svelte;
  const workspaceVite = rootManifest.overrides?.vite;
  const queryVersion = uiManifest.peerDependencies?.['@tanstack/svelte-query'];
  const sveltePlugin = uiManifest.devDependencies?.['@sveltejs/vite-plugin-svelte'];
  assert(workspaceSvelte, 'root package.json: overrides.svelte is required for Surface verification');
  assert(workspaceVite, 'root package.json: overrides.vite is required for Surface verification');
  assert(queryVersion, '@svadmin/ui: @tanstack/svelte-query peer range is required for Surface verification');
  assert(sveltePlugin, '@svadmin/ui: Svelte Vite plugin version is required for Surface verification');

  const combinations = [
    {
      name: 'workspace-packed',
      core: `file:${join(packDirectory, corePack.filename)}`,
      ui: `file:${join(packDirectory, uiPack.filename)}`,
      svelte: workspaceSvelte,
    },
    {
      name: 'minimum-supported',
      core: compatibility.minimumSupported['@svadmin/core'],
      ui: compatibility.minimumSupported['@svadmin/ui'],
      svelte: compatibility.minimumSupported.svelte,
    },
  ] as const;

  const outputs: string[] = [];
  for (const combination of combinations) {
    const consumerDirectory = join(packDirectory, `surface-${combination.name}`);
    await mkdir(consumerDirectory, { recursive: true });
    await writeFile(join(consumerDirectory, 'package.json'), `${JSON.stringify({
      name: `svadmin-surface-${combination.name}`,
      private: true,
      type: 'module',
      packageManager: `pnpm@${pnpmVersion}`,
      dependencies: {
        '@svadmin/core': combination.core,
        '@svadmin/surface': `file:${join(packDirectory, surfacePack.filename)}`,
        '@svadmin/ui': combination.ui,
        '@tanstack/svelte-query': queryVersion,
        svelte: combination.svelte,
      },
      devDependencies: {
        '@sveltejs/vite-plugin-svelte': sveltePlugin,
        vite: workspaceVite,
      },
    }, null, 2)}\n`);
    await writeFile(
      join(consumerDirectory, 'entry.ts'),
      `import { validateSurfaceSpec } from '@svadmin/surface';\n` +
        `import { SurfaceRenderer, defaultSurfaceCatalog } from '@svadmin/surface/svelte';\n` +
        `console.info(typeof validateSurfaceSpec, typeof SurfaceRenderer, defaultSurfaceCatalog.version);\n`,
    );
    await writeFile(
      join(consumerDirectory, 'vite.config.mjs'),
      `import { svelte } from '@sveltejs/vite-plugin-svelte';\n` +
        `export default { plugins: [svelte()], build: { lib: { entry: 'entry.ts', formats: ['es'] } } };\n`,
    );

    run('npx', [
      '--yes',
      `pnpm@${pnpmVersion}`,
      'install',
      '--strict-peer-dependencies',
      '--ignore-scripts',
      '--reporter',
      'append-only',
      '--store-dir',
      join(consumerDirectory, '.pnpm-store'),
    ], consumerDirectory);
    const nodeOutput = run(
      'node',
      ['--input-type=module', '-e', "import('@svadmin/surface').then((module) => console.info(typeof module.validateSurfaceSpec))"],
      consumerDirectory,
    );
    const vitePath = join(repositoryRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    const buildOutput = run('node', [vitePath, 'build', '--config', 'vite.config.mjs'], consumerDirectory);
    outputs.push(`${combination.name}: ${nodeOutput.trim()}\n${buildOutput.trim()}`);
  }

  return outputs.join('\n');
}

async function main(): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'svadmin-pack-check-'));

  try {
    const results = new Map<string, PackResult>();
    const manifests = new Map<string, PackageManifest>();
    const expectationsByDirectory = new Map(
      expectations.map((expectation) => [join(repositoryRoot, expectation.directory), expectation]),
    );
    const workspacePackages = await discoverWorkspacePackages();
    const uiPackage = workspacePackages.find(({ manifest }) => manifest.name === '@svadmin/ui');
    assert(uiPackage, '@svadmin/ui: workspace package was not discovered');
    assertUiDependencyContract(uiPackage.manifest);

    for (const workspacePackage of workspacePackages) {
      const { directory: packageDirectory, manifest } = workspacePackage;
      const expectation = expectationsByDirectory.get(packageDirectory);
      const output = run(
        'npm',
        ['pack', '--json', '--pack-destination', temporaryDirectory],
        packageDirectory,
      );
      const result = parsePackResult(output, manifest.name);
      const filePaths = new Set(result.files.map((file) => file.path));

      for (const target of collectManifestTargets(manifest)) {
        assert(filePaths.has(target), `${manifest.name}: manifest target is missing from tarball: ${target}`);
      }

      assert(
        !result.files.some((file) => /(?:^|\/)[^/]*\.(?:test|spec)(?:[.-]|$)/.test(file.path)),
        `${manifest.name}: tarball unexpectedly publishes test or fixture files`,
      );

      if (expectation) {
        for (const requiredFile of expectation.requiredFiles) {
          assert(
            filePaths.has(requiredFile),
            `${expectation.name}: tarball is missing ${requiredFile}`,
          );
        }

        for (const contentAssertion of expectation.contentAssertions ?? []) {
          const content = await readFile(join(packageDirectory, contentAssertion.path), 'utf8');
          for (const expectedText of contentAssertion.includes ?? []) {
            assert(
              content.includes(expectedText),
              `${expectation.name}: ${contentAssertion.path} is missing ${JSON.stringify(expectedText)}`,
            );
          }
          for (const forbiddenText of contentAssertion.excludes ?? []) {
            assert(
              !content.includes(forbiddenText),
              `${expectation.name}: ${contentAssertion.path} unexpectedly contains ${JSON.stringify(forbiddenText)}`,
            );
          }
        }

        // These packages are intentionally built to dist and must not fall back
        // to publishing source files when their build step is misconfigured.
        assert(
          !result.files.some((file) => file.path.startsWith('src/')),
          `${expectation.name}: tarball unexpectedly publishes raw src files`,
        );

      }

      results.set(manifest.name, result);
      manifests.set(manifest.name, manifest);

      console.info(`${manifest.name}: ${result.files.length} tarball entries verified`);
    }

    for (const expectation of expectations) {
      if (!results.has(expectation.name)) {
        assert(
          false,
          `${expectation.name}: expected workspace package was not discovered`,
        );
      }
    }

    const consumerOutput = await createConsumer(temporaryDirectory, results);
    console.info(consumerOutput.trim());
    const peerTreeOutput = await verifyUiPeerTree(temporaryDirectory, manifests);
    console.info(peerTreeOutput.trim());
    const pnpmPeerTreeOutput = await verifyUiPnpmPeerTree(temporaryDirectory, results, manifests);
    console.info(pnpmPeerTreeOutput.trim());
    const surfaceCompatibilityOutput = await verifySurfaceCompatibility(temporaryDirectory, results, manifests);
    console.info(surfaceCompatibilityOutput.trim());

    for (const result of results.values()) {
      await access(join(temporaryDirectory, result.filename));
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
