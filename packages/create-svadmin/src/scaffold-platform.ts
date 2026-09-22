/**
 * Scaffold platform files.
 *
 * Generates the two stable, AI-readable entrypoints for a new project:
 * `src/svadmin.config.ts` (application composition) and `svadmin.ai.json`
 * (machine-readable manifest). Both are pure string builders so the CLI stays
 * testable without running the interactive `init` prompt.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AuthProviderChoice,
  DataProviderChoice,
} from './project-manifest';
import type { MaintainedPackageJson } from './project-maintenance';

export const SCAFFOLD_CONFIG_PATH = 'src/svadmin.config.ts';
export const ADMIN_AI_MANIFEST_FILENAME = 'svadmin.ai.json';
export const ADMIN_SCHEMA_FILENAME = 'svadmin.schema.json';

export interface ScaffoldPlatformOptions {
  projectName: string;
  dataProvider: DataProviderChoice;
  authProvider: AuthProviderChoice;
  /** `@svadmin/create` version, recorded in the manifest migration section. */
  scaffoldVersion?: string;
  /** `@svadmin/core` range the project targets. */
  coreVersionRange?: string;
}

export interface ScaffoldPlatformFile {
  path: string;
  content: string;
}

export interface ScaffoldPlatformFiles {
  config: ScaffoldPlatformFile;
  aiManifest: ScaffoldPlatformFile;
  schema: ScaffoldPlatformFile;
}

export interface ScaffoldProviderDescriptor {
  package: string | null;
  capabilities: readonly string[];
}

export interface ScaffoldResourceField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

export interface ScaffoldResource {
  name: string;
  label: string;
  fields: readonly ScaffoldResourceField[];
  operations: readonly string[];
}

export interface AdminManifestRoute {
  resource: string;
  path: string;
  operations: readonly string[];
}

export interface AdminManifestComponent {
  name: string;
  package: string;
  import: string;
}

export interface AdminManifestMigration {
  scaffoldVersion: string;
  coreVersionRange: string | null;
  notes: readonly string[];
}

export interface AdminManifestProviderCatalogEntry {
  name: string;
  package: string;
  capabilities: readonly string[];
  stability: string;
}

/**
 * The official provider ecosystem. This is the capability catalog AI tooling and
 * `svadmin add provider` consult; each entry mirrors the package's `svadmin`
 * metadata in package.json.
 */
export const SCAFFOLD_OFFICIAL_PROVIDERS: readonly AdminManifestProviderCatalogEntry[] = [
  { name: 'simple-rest', package: '@svadmin/simple-rest', capabilities: ['data', 'jwt-auth', 'session'], stability: 'stable' },
  { name: 'supabase', package: '@svadmin/supabase', capabilities: ['data', 'auth', 'live', 'storage', 'audit'], stability: 'stable' },
  { name: 'graphql', package: '@svadmin/graphql', capabilities: ['data', 'graphql'], stability: 'stable' },
  { name: 'airtable', package: '@svadmin/airtable', capabilities: ['data'], stability: 'stable' },
  { name: 'appwrite', package: '@svadmin/appwrite', capabilities: ['data', 'auth', 'storage', 'live'], stability: 'stable' },
  { name: 'directus', package: '@svadmin/directus', capabilities: ['data', 'auth'], stability: 'stable' },
  { name: 'drizzle', package: '@svadmin/drizzle', capabilities: ['server-data', 'migrations'], stability: 'stable' },
  { name: 'elysia', package: '@svadmin/elysia', capabilities: ['server-data'], stability: 'stable' },
  { name: 'firebase', package: '@svadmin/firebase', capabilities: ['data', 'auth', 'storage', 'live'], stability: 'stable' },
  { name: 'hasura', package: '@svadmin/hasura', capabilities: ['data', 'graphql', 'live'], stability: 'stable' },
  { name: 'medusa', package: '@svadmin/medusa', capabilities: ['data', 'auth'], stability: 'stable' },
  { name: 'nestjs-query', package: '@svadmin/nestjs-query', capabilities: ['data', 'graphql'], stability: 'stable' },
  { name: 'nestjsx-crud', package: '@svadmin/nestjsx-crud', capabilities: ['data'], stability: 'stable' },
  { name: 'pocketbase', package: '@svadmin/pocketbase', capabilities: ['data', 'auth', 'storage', 'live'], stability: 'stable' },
  { name: 'sanity', package: '@svadmin/sanity', capabilities: ['data', 'live'], stability: 'stable' },
  { name: 'strapi', package: '@svadmin/strapi', capabilities: ['data', 'auth'], stability: 'stable' },
  { name: 'refine-adapter', package: '@svadmin/refine-adapter', capabilities: ['adapter', 'refine-bridge'], stability: 'stable' },
  { name: 'sso', package: '@svadmin/sso', capabilities: ['auth', 'oidc', 'oauth2'], stability: 'stable' },
  { name: 'sveltekit', package: '@svadmin/sveltekit', capabilities: ['router', 'ssr'], stability: 'stable' },
];

export interface AdminAiManifest {
  $schema: string;
  version: 1;
  project: {
    name: string;
    entrypoints: {
      config: string;
      manifest: string;
    };
    commands: Readonly<Record<string, string>>;
    testCommand: string | null;
    forbiddenImports: readonly string[];
  };
  providers: {
    data: { choice: DataProviderChoice } & ScaffoldProviderDescriptor;
    auth: { choice: AuthProviderChoice } & ScaffoldProviderDescriptor;
  };
  resources: readonly ScaffoldResource[];
  routes: readonly AdminManifestRoute[];
  components: readonly AdminManifestComponent[];
  providerCatalog: readonly AdminManifestProviderCatalogEntry[];
  migration: AdminManifestMigration;
  plugins: readonly unknown[];
  guidance: readonly string[];
}

interface MaintainedPackageJsonLike extends MaintainedPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Provider capability matrix; the single source the CLI and doctor share. */
export const SCAFFOLD_DATA_PROVIDERS: Record<DataProviderChoice, ScaffoldProviderDescriptor> = {
  'simple-rest': {
    package: '@svadmin/simple-rest',
    capabilities: ['data', 'filter', 'sort', 'pagination'],
  },
  supabase: {
    package: '@svadmin/supabase',
    capabilities: ['data', 'auth', 'live', 'storage'],
  },
  graphql: {
    package: '@svadmin/graphql',
    capabilities: ['data', 'graphql'],
  },
  airtable: {
    package: '@svadmin/airtable',
    capabilities: ['data'],
  },
  appwrite: {
    package: '@svadmin/appwrite',
    capabilities: ['data', 'auth', 'storage', 'live'],
  },
  directus: {
    package: '@svadmin/directus',
    capabilities: ['data', 'auth'],
  },
  drizzle: {
    package: '@svadmin/drizzle',
    capabilities: ['server-data', 'migrations'],
  },
  elysia: {
    package: '@svadmin/elysia',
    capabilities: ['server-data'],
  },
  firebase: {
    package: '@svadmin/firebase',
    capabilities: ['data', 'auth', 'storage', 'live'],
  },
  hasura: {
    package: '@svadmin/hasura',
    capabilities: ['data', 'graphql', 'live'],
  },
  medusa: {
    package: '@svadmin/medusa',
    capabilities: ['data', 'auth'],
  },
  'nestjs-query': {
    package: '@svadmin/nestjs-query',
    capabilities: ['data', 'graphql'],
  },
  'nestjsx-crud': {
    package: '@svadmin/nestjsx-crud',
    capabilities: ['data'],
  },
  pocketbase: {
    package: '@svadmin/pocketbase',
    capabilities: ['data', 'auth', 'storage', 'live'],
  },
  sanity: {
    package: '@svadmin/sanity',
    capabilities: ['data', 'live'],
  },
  strapi: {
    package: '@svadmin/strapi',
    capabilities: ['data', 'auth'],
  },
  none: {
    package: null,
    capabilities: ['custom'],
  },
};

export const SCAFFOLD_AUTH_PROVIDERS: Record<AuthProviderChoice, ScaffoldProviderDescriptor> = {
  mock: {
    package: null,
    capabilities: ['demo-auth'],
  },
  jwt: {
    package: '@svadmin/simple-rest',
    capabilities: ['jwt-auth', 'session'],
  },
  supabase: {
    package: '@svadmin/supabase',
    capabilities: ['auth', 'session'],
  },
  none: {
    package: null,
    capabilities: [],
  },
};

/** Kept in sync with template/src/resource-contracts.ts and template/src/resources.ts. */
export const SCAFFOLD_RESOURCES: readonly ScaffoldResource[] = [
  {
    name: 'posts',
    label: 'Posts',
    operations: ['list', 'create', 'edit', 'show', 'delete'],
    fields: [
      { key: 'id', label: 'ID', type: 'number', required: true },
      { key: 'title', label: 'Title', type: 'text', required: false },
      { key: 'body', label: 'Body', type: 'textarea', required: false },
      { key: 'userId', label: 'Author', type: 'number', required: false },
    ],
  },
  {
    name: 'users',
    label: 'Users',
    operations: ['list', 'show'],
    fields: [
      { key: 'id', label: 'ID', type: 'number', required: true },
      { key: 'name', label: 'Name', type: 'text', required: false },
      { key: 'username', label: 'Username', type: 'text', required: false },
      { key: 'email', label: 'Email', type: 'email', required: false },
      { key: 'phone', label: 'Phone', type: 'phone', required: false },
      { key: 'website', label: 'Website', type: 'url', required: false },
    ],
  },
  {
    name: 'comments',
    label: 'Comments',
    operations: ['list', 'create', 'edit', 'show', 'delete'],
    fields: [
      { key: 'id', label: 'ID', type: 'number', required: true },
      { key: 'postId', label: 'Post', type: 'number', required: false },
      { key: 'name', label: 'Title', type: 'text', required: false },
      { key: 'email', label: 'Email', type: 'email', required: false },
      { key: 'body', label: 'Body', type: 'textarea', required: false },
    ],
  },
  {
    name: 'todos',
    label: 'Todos',
    operations: ['list', 'create', 'edit', 'show', 'delete'],
    fields: [
      { key: 'id', label: 'ID', type: 'number', required: true },
      { key: 'title', label: 'Title', type: 'text', required: false },
      { key: 'completed', label: 'Done', type: 'boolean', required: false },
      { key: 'userId', label: 'User', type: 'number', required: false },
    ],
  },
];

const SCAFFOLD_MIGRATION_NOTES = [
  'Run `create-svadmin doctor` after changing providers or dependencies.',
  'Apply dependency migrations with `create-svadmin migrate --write`.',
  'Keep src/svadmin.config.ts and svadmin.ai.json in sync.',
] as const;

/** Curated public UI surface for AI page generation. */
export const SCAFFOLD_UI_COMPONENTS: readonly AdminManifestComponent[] = [
  'AdminApp',
  'AutoTable',
  'AutoForm',
  'ShowPage',
  'Layout',
  'Sidebar',
  'Header',
  'CommandPalette',
  'DataState',
  'CreateButton',
  'EditButton',
  'DeleteButton',
  'ShowButton',
  'RefreshButton',
  'ExportButton',
  'ImportButton',
  'FilterBuilder',
  'ConfigErrorScreen',
].map((name) => ({ name, package: '@svadmin/ui', import: '@svadmin/ui' }));

const CUSTOM_DATA_PROVIDER_BODY = [
  'const unsupported = (): never => {',
  "  throw new Error('Configure a DataProvider in src/svadmin.config.ts before using the app.');",
  '};',
  'const dataProvider: DataProvider = {',
  "  getApiUrl: () => '',",
  '  getList: async () => unsupported(),',
  '  getOne: async () => unsupported(),',
  '  create: async () => unsupported(),',
  '  update: async () => unsupported(),',
  '  deleteOne: async () => unsupported(),',
  '};',
];

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/**
 * Builds `src/svadmin.config.ts`. Async providers are resolved with top-level
 * await so the exported config is always a fully-resolved static bundle.
 */
export function buildSvadminConfigSource(options: ScaffoldPlatformOptions): string {
  const imports = new Set<string>(["import { createProviderBundle, defineAdminConfig } from '@svadmin/app';"]);
  const body: string[] = [];
  let needsSupabaseClient = false;

  switch (options.dataProvider) {
    case 'simple-rest':
      imports.add("import { createSimpleRestDataProvider } from '@svadmin/simple-rest';");
      body.push("const dataProvider = await createSimpleRestDataProvider('https://jsonplaceholder.typicode.com');");
      break;
    case 'supabase':
      imports.add("import { createSupabaseDataProvider } from '@svadmin/supabase';");
      needsSupabaseClient = true;
      body.push('const dataProvider = createSupabaseDataProvider(supabaseClient);');
      break;
    case 'graphql':
      imports.add("import { createGraphQLDataProvider } from '@svadmin/graphql';");
      body.push("const dataProvider = await createGraphQLDataProvider('https://example.com/graphql');");
      break;
    case 'none':
      imports.add("import type { DataProvider } from '@svadmin/core';");
      body.push(...CUSTOM_DATA_PROVIDER_BODY);
      break;
    default: {
      const descriptor = SCAFFOLD_DATA_PROVIDERS[options.dataProvider];
      const packageName = descriptor.package ?? '@svadmin/core';
      imports.add("import type { DataProvider } from '@svadmin/core';");
      body.push(
        `// TODO: configure ${packageName} in src/svadmin.config.ts.`,
        'async function createDataProvider(): Promise<DataProvider> {',
        `  throw new Error('Configure the ${options.dataProvider} data provider before running the app.');`,
        '}',
        'const dataProvider = await createDataProvider();',
      );
      break;
    }
  }

  let authExpression: string | null = null;
  switch (options.authProvider) {
    case 'mock':
      imports.add("import { mockAuthProvider } from './providers/mockAuth';");
      authExpression = 'mockAuthProvider';
      break;
    case 'jwt':
      imports.add("import { createSimpleRestAuthProvider } from '@svadmin/simple-rest';");
      body.push("const authProvider = createSimpleRestAuthProvider({ loginUrl: '/api/auth/login', identityUrl: '/api/auth/me' });");
      authExpression = 'authProvider';
      break;
    case 'supabase':
      imports.add("import { createSupabaseAuthProvider } from '@svadmin/supabase';");
      needsSupabaseClient = true;
      body.push('const authProvider = createSupabaseAuthProvider(supabaseClient);');
      authExpression = 'authProvider';
      break;
    case 'none':
      break;
  }

  if (needsSupabaseClient) {
    imports.add("import { supabaseClient } from './providers/supabase';");
    body.unshift(
      "if (!supabaseClient) throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');",
    );
  }

  imports.add("import { resources } from './resources';");

  const providerEntries = ['    dataProvider,', ...(authExpression === null ? [] : [`    authProvider: ${authExpression},`])].join('\n');

  return [
    '/**',
    ' * svadmin application entrypoint — the first file AI tooling should read.',
    ' * Generated by create-svadmin; edit freely.',
    ' */',
    [...imports].join('\n'),
    '',
    body.join('\n'),
    '',
    'export default defineAdminConfig({',
    `  name: ${quote(options.projectName)},`,
    '  providers: createProviderBundle({',
    providerEntries,
    '  }),',
    '  resources,',
    '});',
    '',
  ].join('\n');
}

export function buildAdminAiManifest(options: ScaffoldPlatformOptions): AdminAiManifest {
  return {
    $schema: `./${ADMIN_SCHEMA_FILENAME}`,
    version: 1,
    project: {
      name: options.projectName,
      entrypoints: {
        config: SCAFFOLD_CONFIG_PATH,
        manifest: ADMIN_AI_MANIFEST_FILENAME,
      },
      commands: {
        dev: 'bun run dev',
        build: 'bun run build',
        preview: 'bun run preview',
        check: 'bun run check',
      },
      testCommand: null,
      forbiddenImports: ['@svadmin/ui/src', '@svadmin/core/src', '@svadmin/core/dist'],
    },
    providers: {
      data: { choice: options.dataProvider, ...SCAFFOLD_DATA_PROVIDERS[options.dataProvider] },
      auth: { choice: options.authProvider, ...SCAFFOLD_AUTH_PROVIDERS[options.authProvider] },
    },
    resources: SCAFFOLD_RESOURCES,
    routes: SCAFFOLD_RESOURCES.map((resource) => ({
      resource: resource.name,
      path: `/${resource.name}`,
      operations: resource.operations,
    })),
    components: SCAFFOLD_UI_COMPONENTS,
    providerCatalog: SCAFFOLD_OFFICIAL_PROVIDERS,
    migration: {
      scaffoldVersion: options.scaffoldVersion ?? '0.0.0',
      coreVersionRange: options.coreVersionRange ?? null,
      notes: SCAFFOLD_MIGRATION_NOTES,
    },
    plugins: [],
    guidance: ['AGENTS.md', 'DESIGN.md'],
  };
}

export function buildScaffoldPlatformFiles(options: ScaffoldPlatformOptions): ScaffoldPlatformFiles {
  return {
    config: {
      path: SCAFFOLD_CONFIG_PATH,
      content: buildSvadminConfigSource(options),
    },
    aiManifest: {
      path: ADMIN_AI_MANIFEST_FILENAME,
      content: `${JSON.stringify(buildAdminAiManifest(options), null, 2)}\n`,
    },
    schema: {
      path: ADMIN_SCHEMA_FILENAME,
      content: `${JSON.stringify(buildAdminSchemaJson(), null, 2)}\n`,
    },
  };
}

/** JSON Schema (draft 2020-12) for `svadmin.ai.json`, shipped beside it. */
export function buildAdminSchemaJson(): Record<string, unknown> {
  const provider = {
    type: 'object',
    required: ['choice', 'package', 'capabilities'],
    properties: {
      choice: { type: 'string' },
      package: { type: ['string', 'null'] },
      capabilities: { type: 'array', items: { type: 'string' } },
    },
  };
  const field = {
    type: 'object',
    required: ['key', 'label', 'type', 'required'],
    properties: {
      key: { type: 'string' },
      label: { type: 'string' },
      type: { type: 'string' },
      required: { type: 'boolean' },
    },
  };
  const resource = {
    type: 'object',
    required: ['name', 'label', 'fields', 'operations'],
    properties: {
      name: { type: 'string' },
      label: { type: 'string' },
      fields: { type: 'array', items: field },
      operations: { type: 'array', items: { type: 'string' } },
    },
  };
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://svadmin.dev/schemas/svadmin.ai.json',
    title: 'svadmin AI manifest',
    type: 'object',
    required: ['version', 'project', 'providers', 'resources'],
    properties: {
      $schema: { type: 'string' },
      version: { const: 1 },
      project: {
        type: 'object',
        required: ['name', 'entrypoints', 'commands'],
        properties: {
          name: { type: 'string' },
          entrypoints: {
            type: 'object',
            required: ['config', 'manifest'],
            properties: { config: { type: 'string' }, manifest: { type: 'string' } },
          },
          commands: { type: 'object', additionalProperties: { type: 'string' } },
          testCommand: { type: ['string', 'null'] },
          forbiddenImports: { type: 'array', items: { type: 'string' } },
        },
      },
      providers: {
        type: 'object',
        required: ['data', 'auth'],
        properties: { data: provider, auth: provider },
      },
      resources: { type: 'array', items: resource },
      routes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['resource', 'path', 'operations'],
          properties: {
            resource: { type: 'string' },
            path: { type: 'string' },
            operations: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      components: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'package', 'import'],
          properties: {
            name: { type: 'string' },
            package: { type: 'string' },
            import: { type: 'string' },
          },
        },
      },
      providerCatalog: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'package', 'capabilities', 'stability'],
          properties: {
            name: { type: 'string' },
            package: { type: 'string' },
            capabilities: { type: 'array', items: { type: 'string' } },
            stability: { type: 'string' },
          },
        },
      },
      migration: {
        type: 'object',
        required: ['scaffoldVersion', 'notes'],
        properties: {
          scaffoldVersion: { type: 'string' },
          coreVersionRange: { type: ['string', 'null'] },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
      plugins: { type: 'array' },
      guidance: { type: 'array', items: { type: 'string' } },
    },
  };
}

export interface AdminManifestCheckIssue {
  path: string;
  message: string;
  action: string;
}

function parseManifest(path: string): { manifest?: AdminAiManifest; issue?: AdminManifestCheckIssue } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {
      issue: {
        path,
        message: 'svadmin.ai.json is not valid JSON',
        action: 'regenerate it or run `create-svadmin doctor` after fixing the file',
      },
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Reflect.get(parsed, 'version') !== 1) {
    return {
      issue: {
        path,
        message: 'svadmin.ai.json must be an object with version 1',
        action: 'regenerate the project platform files',
      },
    };
  }
  return { manifest: parsed as AdminAiManifest };
}

function declaredDependencies(project: MaintainedPackageJson): Set<string> {
  return new Set([
    ...Object.keys(project.dependencies ?? {}),
    ...Object.keys(project.devDependencies ?? {}),
  ]);
}

interface InstalledSvadminMeta {
  capabilities?: unknown;
  core?: unknown;
  stability?: unknown;
}

function readInstalledProviderMeta(
  projectDirectory: string,
  packageName: string,
): InstalledSvadminMeta | null {
  const manifestPath = join(projectDirectory, 'node_modules', ...packageName.split('/'), 'package.json');
  if (!existsSync(manifestPath)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const meta = typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'svadmin') : undefined;
    return typeof meta === 'object' && meta !== null ? meta as InstalledSvadminMeta : null;
  } catch {
    return null;
  }
}

function firstVersion(range: string): [number, number, number] | null {
  const match = /(\d+)\.(\d+)\.(\d+)/u.exec(range);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Conservative compatibility: different major, or different minor on 0.x, is incompatible. */
function coreRangesCompatible(projectRange: string, moduleRange: string): boolean {
  const project = firstVersion(projectRange);
  const module = firstVersion(moduleRange);
  if (project === null || module === null) return true;
  if (project[0] !== module[0]) return false;
  return project[0] !== 0 || project[1] === module[1];
}

/**
 * Validates the AI manifest against the project. Only runs when the project
 * opted into the platform entrypoints, so legacy projects stay clean.
 */
export function checkAdminManifest(
  projectDirectory: string,
  project: MaintainedPackageJson,
): AdminManifestCheckIssue[] {
  const configPath = join(projectDirectory, SCAFFOLD_CONFIG_PATH);
  if (!existsSync(configPath)) return [];

  const manifestPath = join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    return [{
      path: manifestPath,
      message: `${SCAFFOLD_CONFIG_PATH} exists but ${ADMIN_AI_MANIFEST_FILENAME} is missing`,
      action: 'regenerate the platform files so AI tooling has a stable entrypoint',
    }];
  }

  const { manifest, issue } = parseManifest(manifestPath);
  if (issue !== undefined) return [issue];
  if (manifest === undefined) return [];

  const issues: AdminManifestCheckIssue[] = [];
  if (!existsSync(join(projectDirectory, ADMIN_SCHEMA_FILENAME))) {
    issues.push({
      path: join(projectDirectory, ADMIN_SCHEMA_FILENAME),
      message: `${ADMIN_AI_MANIFEST_FILENAME} is present but ${ADMIN_SCHEMA_FILENAME} is missing`,
      action: 'regenerate the platform files so editors can validate the manifest',
    });
  }
  const dependencies = declaredDependencies(project);
  const providerPackages = [
    manifest.providers.data.package,
    manifest.providers.auth.package,
  ].filter((name): name is string => name !== null);
  const declaredCore = project.dependencies?.['@svadmin/core'] ?? project.devDependencies?.['@svadmin/core'];

  for (const packageName of new Set(providerPackages)) {
    if (!dependencies.has(packageName)) {
      issues.push({
        path: manifestPath,
        message: `svadmin.ai.json declares provider "${packageName}" but package.json does not depend on it`,
        action: `add ${packageName} to package.json or update svadmin.ai.json`,
      });
      continue;
    }
    const meta = readInstalledProviderMeta(projectDirectory, packageName);
    if (meta === null) continue;
    if (meta.capabilities !== undefined && !Array.isArray(meta.capabilities)) {
      issues.push({
        path: manifestPath,
        message: `${packageName} declares a non-array svadmin.capabilities`,
        action: 'fix the provider package metadata',
      });
    }
    if (typeof meta.core === 'string' && declaredCore !== undefined && !coreRangesCompatible(declaredCore, meta.core)) {
      issues.push({
        path: manifestPath,
        message: `${packageName} declares @svadmin/core ${meta.core}, incompatible with the project range ${declaredCore}`,
        action: `align @svadmin/core with ${meta.core} or upgrade ${packageName}`,
      });
    }
  }

  return issues;
}