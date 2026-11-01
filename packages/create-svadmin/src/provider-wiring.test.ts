import { expect, test } from 'bun:test';
import { buildSvadminConfigSource } from './scaffold-platform';
import { renderDataProvider } from './provider-wiring';

test('Hasura wiring does not ship the admin secret through Vite', () => {
  const snippet = renderDataProvider('hasura');
  const source = buildSvadminConfigSource({
    projectName: 'demo',
    dataProvider: 'hasura',
    authProvider: 'none',
  });
  expect(snippet.env['VITE_HASURA_ADMIN_SECRET']).toBeUndefined();
  expect(source).not.toContain('VITE_HASURA_ADMIN_SECRET');
  expect(source).not.toContain("headers: { 'x-hasura-admin-secret'");
  expect(source).toContain('x-hasura-admin-secret');
  expect(source).toContain('HASURA_ADMIN_SECRET');
  expect(source).toContain('VITE_HASURA_GRAPHQL_URL');
  expect(source).toContain('VITE_HASURA_JWT');
  expect(source).toContain('createHasuraDataProvider');
});

test('Drizzle wiring is an explicit non-runnable stub until a schema module exists', () => {
  const snippet = renderDataProvider('drizzle');
  const source = buildSvadminConfigSource({
    projectName: 'demo',
    dataProvider: 'drizzle',
    authProvider: 'none',
  });
  expect(snippet.env['VITE_DRIZZLE_DATABASE_URL']).toBeUndefined();
  expect(source).not.toContain('schema: {}');
  expect(source).not.toContain('VITE_DRIZZLE');
  expect(source).toContain('non-runnable');
  expect(source).toContain('DRIZZLE_DATABASE_URL');
  expect(source).toContain('src/db/schema.ts');
  expect(source).toContain('const dataProvider: DataProvider');
});
