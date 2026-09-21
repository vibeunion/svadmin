import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
export const source = JSON.parse(readFileSync(resolve(directory, 'source.json'), 'utf8'));
export const runtimeSource = JSON.parse(readFileSync(resolve(directory, 'runtime-source.json'), 'utf8'));

// 运行时代码可经审查推进；Figma 的历史来源不能因此被标记为已同步。
export function verifyRuntimeSources(css, recipe, review = runtimeSource) {
  assert.equal(review.figmaBaselineRevision, source.revision, 'Figma baseline changed without synchronization');
  assert.equal(review.basedOnRecipeBlob, source.recipeBlob, 'Unrelated recipe baseline');
  assert.equal(review.basedOnRecipeSource, source.recipeSource, 'Unrelated historical recipe path');
  assert.equal(review.recipeSource, 'packages/ui/src/recipes.ts', 'Unexpected runtime recipe path');
  assert.equal(review.figmaSynchronized, false, 'Runtime validation cannot assert Figma synchronization');
  assert.equal(review.basedOnStylesheetBlob, source.stylesheetBlob, 'Theme baseline changed');
  assert.equal(review.stylesheet, source.stylesheet, 'Unexpected stylesheet path');
  assert.equal(gitBlob(css), review.stylesheetBlob, 'Source changed: review theme baseline');
  assert.equal(gitBlob(recipe), review.recipeBlob, 'Runtime recipe source changed: review runtime-source.json');
}

export function gitBlob(bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8');
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

// 只支持本套件实际使用的有限 CSS 语法；不声称是通用 CSS 或 DTCG 解析器。
export function parseTheme(css, selector) {
  assert.ok(selector === ':root' || selector === '.dark', 'Unsupported theme selector');
  const literal = selector === '.dark' ? '\\.dark' : ':root';
  const matches = [...css.matchAll(new RegExp(`(?:^|\\n)\\s*${literal}\\s*\\{([^{}]*)\\}`, 'gu'))];
  assert.equal(matches.length, 1, `Expected exactly one ${selector} theme block`);
  const properties = new Map();
  for (const match of matches[0][1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gu)) {
    if (!source.colorRoles.includes(match[1])) continue;
    assert.ok(!properties.has(match[1]), `Duplicate --${match[1]}`);
    properties.set(match[1], match[2].trim());
  }
  return Object.fromEntries(source.colorRoles.map(name => {
    const value = properties.get(name);
    const color = value?.match(/^oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)$/u);
    assert.ok(color, `Missing or unsupported ${selector} --${name}`);
    const components = color.slice(1).map(Number);
    assert.ok(components.every(Number.isFinite), `Non-finite --${name}`);
    assert.ok(components[0] >= 0 && components[0] <= 1 && components[1] >= 0 && components[2] >= 0 && components[2] <= 360, `Out-of-range --${name}`);
    return [name, { css: value, components }];
  }));
}

// 保留原始 OKLCH；Figma 的 sRGB 投影单独标记色域裁剪。
export function oklchToSrgb(components) {
  assert.ok(Array.isArray(components) && components.length === 3 && components.every(Number.isFinite));
  const [L, C, H] = components;
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const raw = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(value => value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055);
  return { rgb: raw.map(value => Math.min(1, Math.max(0, value))), clipped: raw.some(value => value < -1e-6 || value > 1 + 1e-6) };
}

export function buildKit(css) {
  assert.equal(gitBlob(css), runtimeSource.stylesheetBlob, 'Source changed: inspect runtime-source.json before regenerating the design snapshot');
  const sourceSha256 = createHash('sha256').update(css).digest('hex');
  const files = {};
  const provenance = {
    revision: runtimeSource.revision, recipeSource: runtimeSource.recipeSource,
    recipeBlob: runtimeSource.recipeBlob, stylesheet: runtimeSource.stylesheet,
    stylesheetBlob: runtimeSource.stylesheetBlob, figmaSynchronized: false,
  };
  const seed = { runtimeSource: provenance, revision: source.revision, sourceSha256, dimensionsRevision: source.revision, colors: {}, dimensions: source.dimensions, clipped: [] };
  for (const [theme, selector] of [['Light', ':root'], ['Dark', '.dark']]) {
    const colors = parseTheme(css, selector);
    const primitive = {};
    const color = {};
    const dimension = {};
    seed.colors[theme] = {};
    for (const [name, entry] of Object.entries(colors)) {
      primitive[name] = { $type: 'color', $value: { colorSpace: 'oklch', components: entry.components, alpha: 1 } };
      color[name] = { $type: 'color', $value: `{primitive.${name}}`, $extensions: { 'org.svadmin': { cssVariable: `--${name}` } } };
      const projection = oklchToSrgb(entry.components);
      seed.colors[theme][name] = { ...entry, ...projection };
      if (projection.clipped) seed.clipped.push(`${theme}/${name}`);
    }
    for (const [path, entry] of Object.entries(source.dimensions)) {
      const [category, key] = path.split('/');
      assert.ok(category && key && path.split('/').length === 2 && Number.isFinite(entry.value));
      dimension[category] ??= {};
      dimension[category][key] = { $type: 'dimension', $value: { value: entry.value, unit: 'px' }, $description: entry.source, $extensions: { 'org.svadmin': { cssSyntax: entry.cssSyntax } } };
    }
    files[`${theme.toLowerCase()}.tokens.json`] = {
      $description: 'Generated svadmin asset snapshot, not third-party tokens or an independent runtime theme.',
      $extensions: { 'org.svadmin': { revision: source.revision, runtimeSource: provenance, dimensionsRevision: source.revision, sourceSha256, role: 'generated-snapshot', theme, rootFontSizePx: source.rootFontSizePx } },
      primitive, color, dimension,
    };
  }
  files['figma-seed.json'] = seed;
  return files;
}

export function validateManifest(references) {
  assert.equal(references.thirdPartyAssetsIncluded, false);
  assert.deepEqual(references.assets, []);
  assert.deepEqual(references.references.map(entry => entry.id), ['park-foundations']);
  for (const entry of references.references) {
    assert.equal(entry.redistributionApproved, false, 'Unreviewed assets cannot be approved');
    assert.equal(entry.licenseReview, 'pending');
    assert.equal(entry.fileInspection, 'not-completed');
    assert.equal(new URL(entry.officialSource).protocol, 'https:');
    assert.equal(entry.officialSource, 'https://park-ui.com/docs/figma');
    assert.equal(entry.designFile, 'https://www.figma.com/community/file/1268615283036362769');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(argument => argument === '--check'), 'Only --check is supported');
  const root = resolve(directory, '../..');
  const output = resolve(root, 'test-results/admin-ui-design-kit');
  const css = readFileSync(resolve(root, source.stylesheet), 'utf8');
  verifyRuntimeSources(css, readFileSync(resolve(root, runtimeSource.recipeSource)));
  validateManifest(JSON.parse(readFileSync(resolve(directory, 'references.json'), 'utf8')));
  const files = buildKit(css);
  mkdirSync(output, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    const content = JSON.stringify(value, null, 2) + '\n';
    if (process.argv.includes('--check')) assert.equal(readFileSync(resolve(output, name), 'utf8'), content, `${name}: generated drift`);
    else writeFileSync(resolve(output, name), content);
  }
  console.info(JSON.stringify({ files: Object.keys(files), colorsPerTheme: source.colorRoles.length, dimensions: Object.keys(source.dimensions).length, clipped: files['figma-seed.json'].clipped, sourceRevision: source.revision }));
}
