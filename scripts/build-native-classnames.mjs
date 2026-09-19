import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const sources = { ui: 'src/styles/compatibility.prelude.css', 'ai-elements': 'src/utilities.css' };
const boxSides = ['top', 'right', 'bottom', 'left', 'inline-start', 'inline-end', 'block-start', 'block-end'];

function properties(property) {
  if (property === 'padding' || property === 'margin') return boxSides.map((side) => `${property}-${side}`);
  const axis = /^(padding|margin)-(inline|block)$/.exec(property);
  if (axis) return [`${property}-start`, `${property}-end`];
  if (property === 'inset') return ['top', 'right', 'bottom', 'left'];
  if (property === 'gap') return ['row-gap', 'column-gap'];
  if (property === 'border-radius') return ['top-left', 'top-right', 'bottom-right', 'bottom-left'].map((corner) => `border-${corner}-radius`);
  // Conservative: unknown shorthands are never assumed to cover other declarations.
  return [property];
}

/** Build finite conflict metadata from owned CSS, never parse utility syntax at runtime. */
export function classFootprints(text) {
  const result = new Map();
  postcss.parse(text).walkRules((owner) => {
    let utility = false;
    for (let ancestor = owner.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.type === 'rule') return;
      if (ancestor.type === 'atrule' && ancestor.name === 'layer' && ancestor.params === 'utilities') utility = true;
    }
    if (!utility) return;
    const anchors = selectorParser().astSync(owner.selector).nodes
      .filter((selector) => selector.nodes.length === 1 && selector.first.type === 'class')
      .map((selector) => selector.first.value);
    if (!anchors.length) return;
    owner.walkDecls((declaration) => {
      const context = [];
      for (let ancestor = declaration.parent; ancestor && ancestor.type !== 'root'; ancestor = ancestor.parent) {
        if (ancestor.type === 'rule') context.push(ancestor === owner ? '&' : ancestor.selector);
        else if (ancestor.name !== 'layer') context.push(`@${ancestor.name} ${ancestor.params}`);
      }
      const scope = JSON.stringify(context.reverse().map((part) => part.trim()));
      const atoms = properties(declaration.prop).map((property) => `${scope}|${declaration.important ? '!' : ''}${property}`);
      for (const anchor of anchors) {
        if (!result.has(anchor)) result.set(anchor, new Set());
        for (const atom of atoms) result.get(anchor).add(atom);
      }
    });
  });
  return result;
}

export function buildNativeClassnames(name, check = false) {
  assert.ok(Object.hasOwn(sources, name), `Unknown class map target ${name}`);
  const directory = resolve(root, 'packages', name);
  const footprints = classFootprints(readFileSync(resolve(directory, sources[name]), 'utf8'));
  const atoms = [...new Set([...footprints.values()].flatMap((set) => [...set]))].sort();
  const atomIds = new Map(atoms.map((atom, index) => [atom, index]));
  const table = Object.fromEntries([...footprints.keys()].sort().map((key) => [key,
    [...footprints.get(key)].map((atom) => atomIds.get(atom)).sort((left, right) => left - right),
  ]));
  const content = `// Generated from owned finite CSS by scripts/build-native-classnames.mjs.\nexport const classProperties: Readonly<Record<string, readonly number[]>> = ${JSON.stringify(table)};\n`;
  const path = resolve(directory, 'src/class-properties.generated.ts');
  assert.ok(Buffer.byteLength(content) < 300_000, 'Class metadata exceeds its bounded size budget');
  if (check) assert.equal(readFileSync(path, 'utf8'), content, `${name}: class conflict metadata drift`);
  else writeFileSync(path, content);
  console.info(`[native-classes] ${name}: ${footprints.size} known classes, ${Buffer.byteLength(content)} metadata bytes`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = process.argv.slice(2).filter((name) => name !== '--check');
  assert.ok(names.length, 'Pass at least one package name');
  for (const name of names) buildNativeClassnames(name, process.argv.includes('--check'));
}
