import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.ok(typeof version === 'string' && version.length > 0, 'UI package version is required');

const componentPath = new URL('../dist/components/AboutSettings.svelte', import.meta.url);
const component = readFileSync(componentPath, 'utf8');
const placeholder = "const buildVersion = '__SVADMIN_VERSION__';";
const declaration = `const buildVersion = ${JSON.stringify(version)};`;
assert.ok(
  component.includes(placeholder) || component.includes(declaration),
  'AboutSettings build version placeholder is missing; rebuild the package first',
);

writeFileSync(componentPath, component.replace(placeholder, declaration), 'utf8');
console.info(`[stamp-build-version] embedded UI package version ${version}`);
