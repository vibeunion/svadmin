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

  for (const packageName of new Set(providerPackages)) {
    if (!dependencies.has(packageName)) {
      issues.push({
        path: manifestPath,
        message: `svadmin.ai.json declares provider "${packageName}" but package.json does not depend on it`,
        action: `add ${packageName} to package.json or update svadmin.ai.json`,
      });
    }
  }

  return issues;
}