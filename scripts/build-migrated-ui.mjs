import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const pandaPackage = require.resolve('@pandacss/dev/package.json');
const pandaManifest = JSON.parse(readFileSync(pandaPackage, 'utf8'));
const panda = resolve(dirname(pandaPackage), pandaManifest.bin.panda);
const targets = {
  ui: ['packages/ui/design/migrated-utilities', 'packages/ui/src/styles/compatibility.prelude.css'],
  'ai-elements': ['packages/ai-elements/design/migrated-utilities', 'packages/ai-elements/src/utilities.css'],
  example: ['example/design/migrated-utilities', 'example/src/compatibility.css'],
};

// 只重新绑定本次构建生成的类名，保留现有 DOM/CSS 选择器接口。
// 不解析运行时类字符串，也不从旧 CSS 文件复制工具类声明。
function bindSelector(selector, generatedClass, originals) {
  const parsed = selectorParser().astSync(selector);
  const selectors = [];
  for (const original of originals) {
    for (const child of parsed.nodes) {
      const copy = child.clone();
      let found = false;
      copy.walkClasses((node) => {
        if (node.value !== generatedClass) return;
        found = true;
        const replacement = selectorParser().astSync(original).first.nodes.map((part) => part.clone());
        node.replaceWith(...replacement);
      });
      if (found) selectors.push(copy.toString());
    }
  }
  return selectors.join(', ');
}

export function compileMigratedUtilities(name, check = false) {
  const target = targets[name];
  assert.ok(target, `Unknown stylesheet target: ${name}`);
  const [designPath, outputPath] = target.map((path) => resolve(root, path));
  const records = JSON.parse(readFileSync(resolve(designPath, 'recipes.json'), 'utf8'));
  const cache = resolve(root, 'node_modules/.cache/svadmin-migrated-ui', name);
  mkdirSync(cache, { recursive: true });
  const recipes = Object.fromEntries(records.map(({ name: recipe, className, base }) => [recipe, { className, base }]));
  const config = {
    preflight: false, presets: [], prefix: '', include: [],
    outdir: resolve(cache, 'runtime'),
    theme: { recipes },
    staticCss: { recipes: Object.fromEntries(records.map(({ name: recipe }) => [recipe, ['*']])) },
  };
  const configPath = resolve(cache, 'panda.config.mjs');
  writeFileSync(configPath, `export default ${JSON.stringify(config, null, 2)};\n`);
  const generatedPath = resolve(cache, 'generated.css');
  execFileSync(process.execPath, [panda, 'cssgen', '--config', configPath, '--outfile', generatedPath], { cwd: root, stdio: 'inherit' });
  const generated = postcss.parse(readFileSync(generatedPath, 'utf8'));
  const byClass = new Map(records.map((record) => [record.className, record]));
  const output = new Map(records.map((record) => [record.name, []]));
  generated.walkRules((rule) => {
    // Panda emits complete rules. Nested rules are retained with their owning rule.
    for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'rule') return;
    const used = new Set();
    selectorParser((selectors) => selectors.walkClasses((node) => {
      if (byClass.has(node.value)) used.add(node.value);
    })).processSync(rule.selector);
    for (const className of used) {
      const record = byClass.get(className);
      let clone = rule.clone();
      clone.selector = bindSelector(rule.selector, className, record.selectors);
      assert.ok(clone.selector, `Missing public selector for ${record.name}`);
      for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
        assert.equal(parent.type, 'atrule', `Unexpected generated container for ${record.name}`);
        if (parent.name === 'layer') continue;
        clone = postcss.atRule({ name: parent.name, params: parent.params }).append(clone);
      }
      output.get(record.name).push(clone);
    }
  });
  const template = postcss.parse(readFileSync(resolve(designPath, 'foundation.css.template'), 'utf8'));
  let expanded = 0;
  template.walkComments((comment) => {
    const match = /^svadmin-recipe:(\w+)$/.exec(comment.text);
    if (!match) return;
    const nodes = output.get(match[1]);
    assert.ok(nodes?.length, `Panda did not emit recipe ${match[1]}; refusing incomplete CSS`);
    comment.replaceWith(...nodes.map((node) => node.clone()));
    expanded++;
  });
  assert.equal(expanded, records.length, 'Every finite recipe must have exactly one cascade position');
  const css = `${template.toString().trim()}\n`;
  assert.ok(!css.includes('svadmin-recipe:'), 'Unexpanded stylesheet recipe');
  assert.ok(!/\bsvmigration[0-9]+\b/.test(css), 'Internal compiler class leaked into public CSS');
  if (check) assert.equal(readFileSync(outputPath, 'utf8'), css, `${name}: generated CSS drift`);
  else writeFileSync(outputPath, css);
  console.info(`[migrated-ui] ${name}: ${records.length} finite Panda recipes, ${Buffer.byteLength(css)} bytes`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const name of process.argv.filter((arg) => Object.hasOwn(targets, arg))) compileMigratedUtilities(name, process.argv.includes('--check'));
}
