/**
 * Runnable provider and auth snippets for `svadmin.config.ts`.
 *
 * Every official choice calls its real factory. Public endpoints keep a
 * default URL so the happy path starts without secrets. Hosted backends read
 * environment variables and fail with the missing name instead of a TODO stub.
 */
import type { AuthProviderChoice, DataProviderChoice } from './project-manifest';

export interface ProviderSnippet {
  imports: string[];
  body: string;
  env: Record<string, string>;
  exampleResource: string;
}

const REQUIRED_ENV = `function requiredEnv(name: string): string {
  const env = import.meta.env as Record<string, string | undefined> | undefined;
  const value = env?.[name] ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(\`Missing \${name}. Add it to .env before starting the app.\`);
  }
  return value;
}`;

function requiredBody(lines: string[]): string {
  return [REQUIRED_ENV, ...lines].join('\n');
}

const DATA_SNIPPETS: Record<DataProviderChoice, ProviderSnippet> = {
  'simple-rest': {
    imports: ["import { createSimpleRestDataProvider } from '@svadmin/simple-rest';"],
    body: "const dataProvider = await createSimpleRestDataProvider(import.meta.env?.VITE_API_URL || 'https://jsonplaceholder.typicode.com');",
    env: { VITE_API_URL: 'https://jsonplaceholder.typicode.com' },
    exampleResource: 'posts',
  },
  supabase: {
    imports: [
      "import { createSupabaseDataProvider } from '@svadmin/supabase';",
      "import { supabaseClient } from './providers/supabase';",
    ],
    body: [
      "if (!supabaseClient) throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');",
      'const dataProvider = createSupabaseDataProvider(supabaseClient);',
    ].join('\n'),
    env: {
      VITE_SUPABASE_URL: 'https://your-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'your-anon-key',
    },
    exampleResource: 'posts',
  },
  graphql: {
    imports: ["import { createGraphQLDataProvider } from '@svadmin/graphql';"],
    body: "const dataProvider = await createGraphQLDataProvider(import.meta.env?.VITE_GRAPHQL_URL || 'https://countries.trevorblades.com');",
    env: { VITE_GRAPHQL_URL: 'https://countries.trevorblades.com' },
    exampleResource: 'countries',
  },
  rest: {
    imports: ["import { createRestDataProvider } from '@svadmin/rest';"],
    body: "const dataProvider = await createRestDataProvider(import.meta.env?.VITE_API_URL || 'https://jsonplaceholder.typicode.com');",
    env: { VITE_API_URL: 'https://jsonplaceholder.typicode.com' },
    exampleResource: 'posts',
  },
  airtable: {
    imports: ["import { createAirtableDataProvider } from '@svadmin/airtable';"],
    body: requiredBody([
      "const dataProvider = await createAirtableDataProvider(requiredEnv('VITE_AIRTABLE_API_KEY'), requiredEnv('VITE_AIRTABLE_BASE_ID'));",
    ]),
    env: { VITE_AIRTABLE_API_KEY: '', VITE_AIRTABLE_BASE_ID: '' },
    exampleResource: 'posts',
  },
  appwrite: {
    imports: [
      "import { Client } from 'appwrite';",
      "import { createAppwriteDataProvider } from '@svadmin/appwrite';",
    ],
    body: requiredBody([
      'const appwriteClient = new Client()',
      "  .setEndpoint(requiredEnv('VITE_APPWRITE_ENDPOINT'))",
      "  .setProject(requiredEnv('VITE_APPWRITE_PROJECT_ID'));",
      'const dataProvider = await createAppwriteDataProvider(appwriteClient, {',
      "  databaseId: requiredEnv('VITE_APPWRITE_DATABASE_ID'),",
      '});',
    ]),
    env: {
      VITE_APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
      VITE_APPWRITE_PROJECT_ID: '',
      VITE_APPWRITE_DATABASE_ID: '',
    },
    exampleResource: 'posts',
  },
  directus: {
    imports: ["import { createDirectusDataProvider } from '@svadmin/directus';"],
    body: requiredBody([
      "const dataProvider = createDirectusDataProvider(requiredEnv('VITE_DIRECTUS_URL'), import.meta.env?.VITE_DIRECTUS_TOKEN || undefined);",
    ]),
    env: { VITE_DIRECTUS_URL: 'http://127.0.0.1:8055', VITE_DIRECTUS_TOKEN: '' },
    exampleResource: 'posts',
  },
  drizzle: {
    imports: ["import { createDrizzleDataProvider } from '@svadmin/drizzle';"],
    body: requiredBody([
      'const dataProvider = await createDrizzleDataProvider({',
      "  connection: requiredEnv('VITE_DRIZZLE_DATABASE_URL'),",
      '  schema: {},',
      '});',
    ]),
    env: { VITE_DRIZZLE_DATABASE_URL: '' },
    exampleResource: 'posts',
  },
  elysia: {
    imports: ["import { createElysiaDataProvider } from '@svadmin/elysia';"],
    body: "const dataProvider = createElysiaDataProvider({ apiUrl: import.meta.env?.VITE_ELYSIA_URL || 'http://127.0.0.1:3000' });",
    env: { VITE_ELYSIA_URL: 'http://127.0.0.1:3000' },
    exampleResource: 'posts',
  },
  firebase: {
    imports: ["import { createFirebaseDataProvider } from '@svadmin/firebase';"],
    body: requiredBody([
      "const firebaseUrl = requiredEnv('VITE_FIREBASE_DATABASE_URL');",
      "const loaded: unknown = await import('@refinedev/firebase');",
      'const firebaseModule = typeof loaded === \'object\' && loaded !== null ? loaded as Record<string, unknown> : {};',
      'const firebaseInit = [loaded, firebaseModule[\'default\'], firebaseModule[\'dataProvider\'], firebaseModule[\'DataProvider\']].find((candidate) => typeof candidate === \'function\') as ((url: string) => unknown) | undefined;',
      "if (!firebaseInit) throw new Error('Install @refinedev/firebase before using the Firebase data provider.');",
      'const dataProvider = createFirebaseDataProvider(firebaseInit(firebaseUrl));',
    ]),
    env: { VITE_FIREBASE_DATABASE_URL: '' },
    exampleResource: 'posts',
  },
  hasura: {
    imports: [
      "import { GraphQLClient } from 'graphql-request';",
      "import { createHasuraDataProvider } from '@svadmin/hasura';",
    ],
    body: requiredBody([
      "const hasuraClient = new GraphQLClient(requiredEnv('VITE_HASURA_GRAPHQL_URL'), {",
      "  headers: { 'x-hasura-admin-secret': requiredEnv('VITE_HASURA_ADMIN_SECRET') },",
      '});',
      'const dataProvider = await createHasuraDataProvider(hasuraClient);',
    ]),
    env: { VITE_HASURA_GRAPHQL_URL: 'http://127.0.0.1:8080/v1/graphql', VITE_HASURA_ADMIN_SECRET: '' },
    exampleResource: 'posts',
  },
  medusa: {
    imports: ["import { createMedusaDataProvider } from '@svadmin/medusa';"],
    body: requiredBody([
      "const dataProvider = await createMedusaDataProvider(requiredEnv('VITE_MEDUSA_URL'), requiredEnv('VITE_MEDUSA_API_KEY'));",
    ]),
    env: { VITE_MEDUSA_URL: 'http://127.0.0.1:9000', VITE_MEDUSA_API_KEY: '' },
    exampleResource: 'products',
  },
  'nestjs-query': {
    imports: ["import { createNestjsQueryDataProvider } from '@svadmin/nestjs-query';"],
    body: requiredBody([
      "const dataProvider = await createNestjsQueryDataProvider(requiredEnv('VITE_NESTJS_QUERY_URL'));",
    ]),
    env: { VITE_NESTJS_QUERY_URL: 'http://127.0.0.1:3000/graphql' },
    exampleResource: 'posts',
  },
  'nestjsx-crud': {
    imports: ["import { createNestjsxCrudDataProvider } from '@svadmin/nestjsx-crud';"],
    body: requiredBody([
      "const dataProvider = await createNestjsxCrudDataProvider(requiredEnv('VITE_NESTJSX_CRUD_URL'));",
    ]),
    env: { VITE_NESTJSX_CRUD_URL: 'http://127.0.0.1:3000' },
    exampleResource: 'posts',
  },
  pocketbase: {
    imports: [
      "import PocketBase from 'pocketbase';",
      "import { createPocketBaseDataProvider } from '@svadmin/pocketbase';",
    ],
    body: [
      "const pocketBase = new PocketBase(import.meta.env?.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');",
      'const dataProvider = createPocketBaseDataProvider({ pb: pocketBase });',
    ].join('\n'),
    env: { VITE_POCKETBASE_URL: 'http://127.0.0.1:8090' },
    exampleResource: 'posts',
  },
  sanity: {
    imports: ["import { createSanityDataProvider } from '@svadmin/sanity';"],
    body: requiredBody([
      'const dataProvider = createSanityDataProvider(',
      "  requiredEnv('VITE_SANITY_PROJECT_ID'),",
      "  requiredEnv('VITE_SANITY_DATASET'),",
      '  import.meta.env?.VITE_SANITY_TOKEN || undefined,',
      ');',
    ]),
    env: { VITE_SANITY_PROJECT_ID: '', VITE_SANITY_DATASET: 'production', VITE_SANITY_TOKEN: '' },
    exampleResource: 'posts',
  },
  strapi: {
    imports: ["import { createStrapiDataProvider } from '@svadmin/strapi';"],
    body: requiredBody([
      "const strapiUrl = requiredEnv('VITE_STRAPI_URL');",
      "const strapiToken = requiredEnv('VITE_STRAPI_TOKEN');",
      'const strapiClient = async (url: string, options?: RequestInit) => {',
      '  const response = await fetch(url, {',
      '    ...options,',
      '    headers: { Authorization: `Bearer ${strapiToken}`, ...(options?.headers ?? {}) },',
      '  });',
      '  return { data: await response.json() };',
      '};',
      'const dataProvider = await createStrapiDataProvider(strapiUrl, strapiClient);',
    ]),
    env: { VITE_STRAPI_URL: 'http://127.0.0.1:1337', VITE_STRAPI_TOKEN: '' },
    exampleResource: 'posts',
  },
  none: {
    imports: ["import type { DataProvider } from '@svadmin/core';"],
    body: [
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
    ].join('\n'),
    env: {},
    exampleResource: 'posts',
  },
};

export interface AuthSnippet {
  imports: string[];
  body: string;
  expression: string | null;
  env: Record<string, string>;
}

const AUTH_SNIPPETS: Record<AuthProviderChoice, AuthSnippet> = {
  mock: {
    imports: ["import { mockAuthProvider } from './providers/mockAuth';"],
    body: '',
    expression: 'mockAuthProvider',
    env: {},
  },
  jwt: {
    imports: ["import { createSimpleRestAuthProvider } from '@svadmin/simple-rest';"],
    body: "const authProvider = createSimpleRestAuthProvider({ loginUrl: '/api/auth/login', identityUrl: '/api/auth/me' });",
    expression: 'authProvider',
    env: {},
  },
  supabase: {
    imports: [
      "import { createSupabaseAuthProvider } from '@svadmin/supabase';",
      "import { supabaseClient } from './providers/supabase';",
    ],
    body: [
      "if (!supabaseClient) throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');",
      'const authProvider = createSupabaseAuthProvider(supabaseClient);',
    ].join('\n'),
    expression: 'authProvider',
    env: {
      VITE_SUPABASE_URL: 'https://your-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'your-anon-key',
    },
  },
  none: {
    imports: [],
    body: '',
    expression: null,
    env: {},
  },
};

export function renderDataProvider(choice: DataProviderChoice): ProviderSnippet {
  return DATA_SNIPPETS[choice];
}

export function renderAuthProvider(choice: AuthProviderChoice): AuthSnippet {
  return AUTH_SNIPPETS[choice];
}

export function markRegion(kind: 'data' | 'auth', body: string): string {
  return `/* @svadmin ${kind}-provider */\n${body}\n/* @svadmin end ${kind}-provider */`;
}

export function providerSmokeSource(choice: string, resource: string): string {
  return `/**
 * Runnable data-provider check for ${choice}.
 * From the project root: bun src/examples/${choice}-smoke.ts
 *
 * Public defaults can run without secrets. Hosted backends exit when a
 * required variable from .env.example is missing.
 */
import config from '../svadmin.config';

const providers = config.providers;
if (!providers || Array.isArray(providers) || !('dataProvider' in providers) || !providers.dataProvider) {
  throw new Error('svadmin.config.ts is missing a dataProvider');
}

try {
  const result = await providers.dataProvider.getList({
    resource: '${resource}',
    pagination: { current: 1, pageSize: 5 },
  });
  const count = Array.isArray(result.data) ? result.data.length : 0;
  console.log(JSON.stringify({ provider: '${choice}', total: result.total, count }));
} catch (error) {
  const message = error instanceof Error ? error.message : 'Provider request failed';
  console.error(message);
  process.exitCode = 1;
}
`;
}

export function authSmokeSource(choice: string): string {
  return `/**
 * Runnable auth wiring check for ${choice}.
 * From the project root: bun src/examples/${choice}-auth-smoke.ts
 */
import config from '../svadmin.config';

const providers = config.providers;
if (!providers || Array.isArray(providers) || !('authProvider' in providers) || !providers.authProvider) {
  throw new Error('svadmin.config.ts is missing an authProvider');
}

console.log(JSON.stringify({
  auth: '${choice}',
  check: typeof providers.authProvider.check === 'function',
}));
`;
}

export function mergeEnvExample(existing: string, entries: Record<string, string>): string {
  const normalized = existing.length === 0 || existing.endsWith('\n') ? existing : `${existing}\n`;
  const present = new Set(
    normalized
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => line.split('=')[0] ?? ''),
  );
  const additions = Object.entries(entries)
    .filter(([key]) => !present.has(key))
    .map(([key, value]) => `${key}=${value}`);
  if (additions.length === 0) return normalized;
  return `${normalized}${additions.join('\n')}\n`;
}

export const DATA_PROVIDER_IMPORTS = [...new Set(Object.values(DATA_SNIPPETS).flatMap((snippet) => snippet.imports))];
export const AUTH_PROVIDER_IMPORTS = [...new Set(Object.values(AUTH_SNIPPETS).flatMap((snippet) => snippet.imports))];
