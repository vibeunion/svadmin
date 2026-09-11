import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import './check-strict-boundaries';
import { assertStrictProject, checkWorkspaceCoverage } from './check-type-coverage';
import { checkSupabaseSerializerSource } from './check-supabase-serializer-source';

checkWorkspaceCoverage();
checkSupabaseSerializerSource();

const require = createRequire(import.meta.url);
const compiler = resolve(dirname(require.resolve('@typescript/native/package.json')), 'bin/tsc');
const root = resolve(import.meta.dir, '..');

for (const project of [
  'tsconfig.bun-tests.json',
  'packages/core/tsconfig.strict.json',
  'packages/core/tsconfig.bun-tests.json',
  'packages/core/tsconfig.component-tests.json',
  'packages/auth-utils/tsconfig.strict.json',
  'packages/sso/tsconfig.strict.json',
  'packages/create-svadmin/tsconfig.strict.json',
  'packages/create-svadmin/tsconfig.json',
  'packages/airtable/tsconfig.json',
  'packages/hasura/tsconfig.json',
  'packages/nestjsx-crud/tsconfig.json',
  'packages/refine-adapter/tsconfig.json',
  'packages/strapi/tsconfig.json',
  'packages/sveltekit/tsconfig.json',
  'packages/firebase/tsconfig.json',
  'packages/directus/tsconfig.json',
  'packages/nestjs-query/tsconfig.json',
  'packages/medusa/tsconfig.json',
  'packages/sanity/tsconfig.json',
  'packages/core/tsconfig.providers.json',
  'packages/core/tsconfig.tooling.json',
  'packages/drizzle/tsconfig.json',
  'scripts/fixtures/drizzle-types/tsconfig.json',
  'scripts/fixtures/flow-types/tsconfig.json',
  'scripts/fixtures/bits-types/tsconfig.json',
  'scripts/fixtures/supabase-types/tsconfig.json',
  'scripts/fixtures/supabase-types/tsconfig.live.json',
  'scripts/fixtures/supabase-types/tsconfig.auth.json',
  'scripts/fixtures/supabase-types/tsconfig.audit.json',
  'scripts/fixtures/supabase-types/tsconfig.tasks.json',
  'scripts/fixtures/supabase-types/tsconfig.runtime.json',
  'packages/lite/tsconfig.server-tests.json',
  'packages/lite/example/tsconfig.bun-tests.json',
  'packages/pocketbase/tsconfig.json',
  'scripts/fixtures/pocketbase-types/tsconfig.json',
  'packages/flow/tsconfig.tooling.json',
  'packages/elysia/tsconfig.json',
  'scripts/fixtures/elysia-types/tsconfig.json',
  'scripts/fixtures/elysia-types/tsconfig.runtime.json',
  'example/tsconfig.schemas.json',
]) {
  console.info(`Checking all strict flags and dependency declarations: ${project}`);
  assertStrictProject(project);
  const contracts = spawnSync(process.env['NODE_BINARY'] ?? 'node', [
    compiler, '--noEmit', '--pretty', 'false', '-p', project,
  ], { cwd: root, stdio: 'inherit' });
  if (contracts.error) console.error(contracts.error.message);
  if (contracts.status !== 0) process.exit(contracts.status ?? 1);
}

// Separate programs keep declaration merging from leaking into fallback tests.
for (const name of ['registered', 'unregistered', 'mutations', 'strict']) {
  console.info(`Checking core resource types: ${name}`);
  assertStrictProject(`scripts/fixtures/core-resource-types/tsconfig.${name}.json`);
  const result = spawnSync(process.env['NODE_BINARY'] ?? 'node', [
    compiler,
    '--noEmit',
    '--pretty', 'false',
    '-p', `scripts/fixtures/core-resource-types/tsconfig.${name}.json`,
  ], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
