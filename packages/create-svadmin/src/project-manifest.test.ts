import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  AUTH_PROVIDER_CHOICES,
  DATA_PROVIDER_CHOICES,
  createProjectPackageJson,
  loadScaffoldManifest,
} from './project-manifest';

const scaffold = loadScaffoldManifest(resolve(import.meta.dir, '..', 'scaffold-manifest.json'));

describe('create-svadmin project manifest', () => {
  test('generates every provider combination from the canonical dependency packs', () => {
    for (const dataProvider of DATA_PROVIDER_CHOICES) {
      for (const authProvider of AUTH_PROVIDER_CHOICES) {
        const generated = createProjectPackageJson(scaffold, {
          projectName: '  generated-admin  ',
          dataProvider,
          authProvider,
        });

        expect(generated.name).toBe('generated-admin');
        expect(generated.dependencies['@svadmin/core']).toBeDefined();
        expect(generated.dependencies['@svadmin/ai-elements']).toBeDefined();
        expect(generated.dependencies['@svadmin/ui']).toBeDefined();
        expect(generated.devDependencies.svelte).toBeDefined();
        expect(generated.devDependencies.typescript).toBeDefined();
        expect('svadmin' in generated).toBe(false);
      }
    }
  });

  test('adds the complete compatible pack for each selected provider', () => {
    const simpleRest = createProjectPackageJson(scaffold, {
      projectName: 'rest-admin',
      dataProvider: 'simple-rest',
      authProvider: 'jwt',
    });
    for (const packageName of ['@svadmin/simple-rest', '@refinedev/simple-rest', '@refinedev/core']) {
      expect(simpleRest.dependencies[packageName]).toBeDefined();
    }

    const supabase = createProjectPackageJson(scaffold, {
      projectName: 'supabase-admin',
      dataProvider: 'none',
      authProvider: 'supabase',
    });
    for (const packageName of [
      '@svadmin/supabase',
      '@supabase/supabase-js',
      '@refinedev/supabase',
      '@refinedev/core',
    ]) {
      expect(supabase.dependencies[packageName]).toBeDefined();
    }

    const graphql = createProjectPackageJson(scaffold, {
      projectName: 'graphql-admin',
      dataProvider: 'graphql',
      authProvider: 'none',
    });
    for (const packageName of [
      '@svadmin/graphql',
      '@refinedev/graphql',
      '@refinedev/core',
      'graphql-request',
      'graphql',
    ]) {
      expect(graphql.dependencies[packageName]).toBeDefined();
    }
  });

  test('does not leak provider dependencies into an unconfigured project', () => {
    const generated = createProjectPackageJson(scaffold, {
      projectName: 'headless-admin',
      dataProvider: 'none',
      authProvider: 'none',
    });

    expect(Object.keys(generated.dependencies).some((name) => name.startsWith('@refinedev/'))).toBe(false);
    expect(Object.keys(generated.dependencies).some((name) => name.startsWith('@svadmin/simple-rest'))).toBe(false);
    expect(Object.keys(generated.dependencies).some((name) => name.startsWith('@svadmin/supabase'))).toBe(false);
    expect(Object.keys(generated.dependencies).some((name) => name.startsWith('@svadmin/graphql'))).toBe(false);
  });
});
