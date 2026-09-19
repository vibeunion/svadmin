import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

function cssProperty(property) {
  if (property.startsWith('--')) return property;
  const value = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return /^ms[A-Z]/.test(property) ? `-${value}` : value;
}

function normalizedValue(value) {
  const text = String(value).trim();
  if (/^0(?:px|rem|em)?$/.test(text)) return '0';
  // Preserve quoted content exactly; only normalize insignificant function spacing.
  return text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^'"]+/g, (part) =>
    /^["']/.test(part) ? part : part.replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1')).trim();
}

function expectedDeclarations(base, result = []) {
  for (const [key, value] of Object.entries(base)) {
    if (value !== null && typeof value === 'object') {
      assert.ok(!Array.isArray(value), 'Represent ordered fallbacks as separate finite recipe fragments');
      expectedDeclarations(value, result);
    } else {
      assert.ok(typeof value === 'string' || typeof value === 'number', `Unsupported CSS value for ${key}`);
      const important = /\s*!important$/.test(String(value));
      result.push(JSON.stringify([cssProperty(key), normalizedValue(String(value).replace(/\s*!important$/, '')), important]));
    }
  }
  return result;
}

/** Every source declaration must survive, not merely one selector per recipe. */
export function verifyRecipeDeclarations(records, css) {
  const known = new Map(records.map((record) => [record.className, new Set()]));
  postcss.parse(css).walkRules((rule) => {
    for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'rule') return;
    const used = new Set();
    selectorParser((selectors) => selectors.walkClasses((node) => {
      if (known.has(node.value)) used.add(node.value);
    })).processSync(rule.selector);
    rule.walkDecls((declaration) => {
      const value = JSON.stringify([declaration.prop, normalizedValue(declaration.value), Boolean(declaration.important)]);
      for (const name of used) known.get(name).add(value);
    });
  });
  const missing = [];
  let checked = 0;
  for (const record of records) {
    for (const declaration of expectedDeclarations(record.base)) {
      checked++;
      if (!known.get(record.className)?.has(declaration)) missing.push(`${record.name}: ${declaration}`);
    }
  }
  assert.equal(missing.length, 0, `Panda dropped or changed ${missing.length} declarations:\n${missing.slice(0, 30).join('\n')}`);
  return checked;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const name of ['ui', 'ai-elements', 'example']) {
    const base = name === 'example' ? 'example' : `packages/${name}`;
    const records = JSON.parse(readFileSync(resolve(root, base, 'design/migrated-utilities/recipes.json'), 'utf8'));
    const css = readFileSync(resolve(root, 'node_modules/.cache/svadmin-migrated-ui', name, 'generated.css'), 'utf8');
    console.info(`[declaration-coverage] ${name}: ${verifyRecipeDeclarations(records, css)} source declarations preserved`);
  }
}
