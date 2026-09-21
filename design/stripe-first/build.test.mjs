import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildKit, gitBlob, oklchToSrgb, parseTheme, source, runtimeSource, verifyRuntimeSources, validateManifest } from './build.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const read = name => JSON.parse(readFileSync(resolve(directory, name), 'utf8'));
const css = readFileSync(resolve(root, source.stylesheet), 'utf8');

for (const [theme, selector] of [['Light', ':root'], ['Dark', '.dark']]) {
  test(`${theme} extracts all sixteen source roles and preserves numeric OKLCH`, () => {
    const colors = parseTheme(css, selector);
    assert.deepEqual(Object.keys(colors), source.colorRoles);
    assert.equal(Object.keys(colors).length, 16);
    assert.deepEqual(colors.primary.components, theme === 'Light' ? [0.558, 0.22, 278] : [0.68, 0.18, 278]);
  });
}

test('pins actual runtime stylesheet and recipe blobs without rewriting historical provenance', () => {
  assert.equal(gitBlob(css), runtimeSource.stylesheetBlob);
  verifyRuntimeSources(css, readFileSync(resolve(root, runtimeSource.recipeSource)));
  assert.equal(gitBlob(readFileSync(resolve(root, runtimeSource.recipeSource))), runtimeSource.recipeBlob);
  assert.equal(source.recipeSource, 'packages/ui/design/primitive-recipes.ts');
  assert.equal(source.stylesheetBlob, '149f55f3782470ec6a1c942917c09510bd55320a');
});

test('source changes cannot masquerade as a synchronized snapshot', () => {
  assert.throws(() => buildKit(css + '\n/* changed */'), /Source changed/u);
});

test('missing, duplicate and unsupported theme selectors fail closed', () => {
  assert.throws(() => parseTheme('', ':root'), /exactly one/u);
  assert.throws(() => parseTheme(css + '\n:root { --primary: red; }', ':root'), /exactly one/u);
  assert.throws(() => parseTheme(css, '[data-theme]'), /Unsupported/u);
});

test('missing colors and duplicate properties cannot pass extraction', () => {
  assert.throws(() => parseTheme(css.replace('--primary: oklch(0.558 0.22 278);', ''), ':root'), /Missing/u);
  assert.throws(() => parseTheme(css.replace('--primary: oklch(0.558 0.22 278);', '--primary: oklch(0.558 0.22 278); --primary: oklch(0.5 0.2 278);'), ':root'), /Duplicate/u);
});

for (const invalid of ['var(--other)', 'oklch(2 0.2 278)', 'oklch(0..5 0.2 278)', 'oklch(0.5 0.2 400)']) {
  test(`rejects unsupported color ${invalid}`, () => {
    assert.throws(() => parseTheme(css.replace('oklch(0.558 0.22 278)', invalid), ':root'));
  });
}

test('DTCG snapshots use structured types and same-file aliases', () => {
  const files = buildKit(css);
  assert.deepEqual(Object.keys(files), ['light.tokens.json', 'dark.tokens.json', 'figma-seed.json']);
  for (const name of ['light.tokens.json', 'dark.tokens.json']) {
    const document = files[name];
    for (const role of source.colorRoles) {
      assert.equal(document.color[role].$value, `{primitive.${role}}`);
      assert.equal(document.primitive[role].$type, 'color');
      assert.equal(document.primitive[role].$value.colorSpace, 'oklch');
      assert.equal(document.primitive[role].$value.alpha, 1);
    }
    const dimensions = Object.values(document.dimension).flatMap(group => Object.values(group));
    assert.equal(dimensions.length, 17);
    for (const entry of dimensions) {
      assert.equal(entry.$type, 'dimension');
      assert.equal(entry.$value.unit, 'px');
      assert.equal(typeof entry.$value.value, 'number');
    }
  }
});

test('sRGB projection preserves neutral endpoints and records clipping', () => {
  assert.deepEqual(oklchToSrgb([0, 0, 0]).rgb, [0, 0, 0]);
  assert.ok(oklchToSrgb([1, 0, 0]).rgb.every(value => Math.abs(value - 1) < 1e-6));
  assert.throws(() => oklchToSrgb([NaN, 0, 0]));
  const seed = buildKit(css)['figma-seed.json'];
  assert.deepEqual(seed.clipped, source.expectedClipping);
  for (const colors of Object.values(seed.colors)) for (const entry of Object.values(colors)) {
    assert.ok(entry.rgb.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  }
});

test('generation is deterministic and never changes the source asset', () => {
  assert.equal(JSON.stringify(buildKit(css)), JSON.stringify(buildKit(css)));
  assert.equal(gitBlob(readFileSync(resolve(root, runtimeSource.stylesheet))), runtimeSource.stylesheetBlob);
});

test('reference permissions remain separate from source availability', () => {
  const references = read('references.json');
  validateManifest(references);
  const copy = structuredClone(references);
  copy.references[0].redistributionApproved = true;
  assert.throws(() => validateManifest(copy), /Unreviewed/u);
  const bundled = structuredClone(references);
  bundled.assets.push({ name: 'third-party-file' });
  assert.throws(() => validateManifest(bundled));
});

test('Figma handoff cannot claim pending components or Code Connect are complete', () => {
  const map = read('figma-map.json');
  assert.equal(map.fileKey, 'r02lMyLBPoaNS3gep3TNRF');
  assert.equal(Object.values(map.collections).reduce((total, entry) => total + entry.variableCount, 0), 81);
  assert.equal(map.components.length, 1);
  const button = map.components[0];
  assert.equal(Object.values(button.axes).reduce((total, values) => total * values.length, 1), button.variantCount);
  assert.equal(button.variantCount, 24);
  assert.equal(button.browserParityCertified, false);
  assert.equal(map.codeConnect.registered, false);
  assert.deepEqual(map.pending, ['Input', 'Badge', 'resource-list', 'record-detail', 'settings']);
  assert.equal(read('handoff.json').state, 'partial');
});

test('page contracts remain finite metadata, not new runtime authority', () => {
  const contract = read('contract.json');
  assert.equal(contract.notRuntimeSurfaceSchema, true);
  assert.equal(contract.tailwindAllowed, false);
  assert.equal(contract.runtimeChanges, false);
  assert.deepEqual(contract.patterns.map(pattern => pattern.id), ['resource-list', 'record-detail', 'settings']);
  for (const pattern of contract.patterns) {
    assert.equal(pattern.figmaStatus, 'pending');
    assert.equal(new Set(pattern.states).size, pattern.states.length);
    assert.ok(pattern.components.length && pattern.rules.length);
  }
});


test('runtime review retains historical Figma provenance and fails on unreviewed recipe drift', () => {
  const recipe = readFileSync(resolve(root, runtimeSource.recipeSource));
  verifyRuntimeSources(css, recipe);
  assert.throws(() => verifyRuntimeSources(css, Buffer.concat([recipe, Buffer.from('/* drift */')])), /source changed/u);
  assert.throws(() => verifyRuntimeSources(css, recipe, { ...runtimeSource, figmaSynchronized: true }), /synchronization/u);
  assert.throws(() => verifyRuntimeSources(css, recipe, { ...runtimeSource, figmaBaselineRevision: runtimeSource.revision }), /baseline changed/u);
  assert.throws(() => verifyRuntimeSources(css, recipe, { ...runtimeSource, basedOnRecipeBlob: 'unrelated' }), /Unrelated/u);
  assert.throws(() => verifyRuntimeSources(css + '\n/* drift */', recipe), /Source changed/u);
  assert.throws(() => verifyRuntimeSources(css, recipe, { ...runtimeSource, recipeSource: source.recipeSource }), /Unexpected runtime/u);
  assert.throws(() => verifyRuntimeSources(css, recipe, { ...runtimeSource, basedOnStylesheetBlob: 'unrelated' }), /Theme baseline changed/u);
  const seed = buildKit(css)['figma-seed.json'];
  assert.equal(seed.revision, read('figma-map.json').sourceRevision);
  assert.equal(seed.runtimeSource.figmaSynchronized, false);
  assert.equal(seed.runtimeSource.stylesheetBlob, gitBlob(css));
  assert.equal(seed.dimensionsRevision, source.revision);
});
