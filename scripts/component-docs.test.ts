import { expect, test } from 'bun:test';
import { componentDocsDrift, generateComponentDocs } from './component-docs';

test('generated component docs include props, states, and a svelte snippet', () => {
  const document = generateComponentDocs();
  expect(document).toContain('## PagePattern');
  expect(document).toContain('| Prop | Kind | Required | Default | Values | Description |');
  expect(document).toContain('| State | Component |');
  expect(document).toContain('```svelte');
  expect(document).toContain('svadmin/design-v1');
  expect(document).toContain('ready, loading, empty, filtered-empty, error, forbidden');
});

test('committed component docs match the registry', () => {
  expect(componentDocsDrift()).toEqual([]);
});
