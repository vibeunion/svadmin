import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import postcss from 'postcss';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';

const BASE = 'cf6c4746578176ea773a17ef6f49f353292f7818';
const read = (p) => readFileSync(p, 'utf8');
const write = (p, text) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
const change = (p, fn) => write(p, fn(read(p)));
const digest = (s) => createHash('sha256').update(s).digest('hex');
const json = (p, fn) => write(p, `${JSON.stringify(fn(JSON.parse(read(p))), null, 2)}\n`);
const version = process.env.PANDA_VERSION;
assert.match(version ?? '', /^\d+\.\d+\.\d+$/);
assert.equal(execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim(), 'feat/panda-tokens-no-tailwind');

// 仅本次迁移使用固定基线编译器；生成后会删除此脚本和写入工作流。
const oldBuild = execFileSync('git', ['show', `${BASE}:packages/ui/scripts/build-static-css.mjs`], { encoding: 'utf8' });
write('packages/ui/scripts/.capture-css.mjs', oldBuild);
try {
  execFileSync(process.execPath, ['packages/ui/scripts/.capture-css.mjs'], { stdio: 'inherit' });
  execFileSync(process.execPath, ['packages/ui/scripts/postbuild-css.mjs'], { stdio: 'inherit' });
} finally { rmSync('packages/ui/scripts/.capture-css.mjs', { force: true }); }
const before = read('packages/ui/dist/app.css');
assert.equal(digest(before), '6e66d8c843dd623e89007d7d8c4b4d36fe3d248f228fac8f5bc38b01e6f6dd4e', 'UI baseline changed');
const baseline = postcss.parse(before);
const start = baseline.nodes.findIndex((n) => n.type === 'atrule' && n.name === 'layer' && n.params === 'components');
const end = baseline.nodes.findIndex((n, i) => i > start && n.type === 'atrule' && n.name === 'property' && n.params === '--tw-translate-x');
assert.equal(start, 23); assert.equal(end, 227);
const aliases = baseline.nodes.at(-1);
assert.equal(aliases.selector, ':root,\n.svadmin-theme');
const print = (nodes) => `${postcss.root({ nodes: nodes.map((n) => n.clone()) }).toString().trim()}\n`;
const original = postcss.parse(read('packages/ui/src/app.css'));
original.walkAtRules((n) => { if (['import', 'theme', 'source'].includes(n.name)) n.remove(); });
function restoreComments(source, nodes) {
  let index = 0;
  const output = [];
  for (const node of source.nodes) output.push(node.type === 'comment' ? node : nodes[index++]);
  assert.equal(index, nodes.length, 'Authored CSS boundaries changed');
  return print(output);
}
write('packages/ui/src/styles/compatibility.prelude.css', print(baseline.nodes.slice(0, start)));
write('packages/ui/src/styles/compatibility.epilogue.css', print(baseline.nodes.slice(end, -1)));
write('packages/ui/src/styles/aliases.css', print([aliases]));
write('packages/ui/src/page-chrome.css', restoreComments(postcss.parse(read('packages/ui/src/page-chrome.css')), [baseline.nodes[start]]));
write('packages/ui/src/components.css', restoreComments(original, baseline.nodes.slice(start + 1, end)));
const parts = ['styles/compatibility.prelude.css', 'page-chrome.css', 'components.css', 'styles/compatibility.epilogue.css', 'styles/aliases.css'];
function semantic(node) {
  if (node.type === 'comment') return null;
  return {
    type: node.type,
    ...(node.name ? { name: node.name, params: node.params } : {}),
    ...(node.selector ? { selector: node.selector } : {}),
    ...(node.prop ? { prop: node.prop, value: node.value, important: !!node.important } : {}),
    ...(node.nodes ? { nodes: node.nodes.map(semantic).filter(Boolean) } : {}),
  };
}
const assembled = postcss.parse(parts.map((p) => read(`packages/ui/src/${p}`)).join('\n'));
assert.deepEqual(semantic(assembled), semantic(baseline), 'CSS cascade/declarations changed during split');
write('packages/ui/src/app.css', [...parts, 'styles/recipes.css'].map((p) => `@import "./${p}";`).join('\n') + '\n');
const manifest = { baseCommit: BASE, sourceCssSha256: digest(before), cascadeSha256: digest(JSON.stringify(semantic(baseline))), files: Object.fromEntries(parts.map((p) => [p, digest(read(`packages/ui/src/${p}`)))])) };
write('packages/ui/styles-compatibility.json', `${JSON.stringify(manifest, null, 2)}\n`);

const metadata = postcss.atRule({ name: 'theme' });
aliases.walkDecls((n) => metadata.append(n.clone()));
const utilityInput = `@import "tailwindcss";\n@import "tw-animate-css";\n${metadata.toString()}\n@custom-variant dark (&:is(.dark *));`;
async function captureUtilities(paths) {
  const scanner = new Scanner({ sources: paths.map((base) => ({ base: resolve(base), pattern: '**/*', negated: false })) });
  const compiler = await compile(utilityInput, { base: resolve('example/src'), onDependency() {} });
  const css = postcss.parse(compiler.build(scanner.scan()));
  // UI 自己保留既有 reset；AI 和示例只携带所需变量、工具类及动画。
  css.walkAtRules('layer', (rule) => { if (rule.params === 'base') rule.remove(); });
  return `${css.toString().trim()}\n`;
}
const aiPaths = ['packages/ai-elements/src', 'node_modules/streamdown-svelte/dist'];
write('packages/ai-elements/src/utilities.css', await captureUtilities(aiPaths));
write('example/src/compatibility.css', await captureUtilities(['example/src', ...aiPaths]));
const aiSource = postcss.parse(read('packages/ai-elements/src/ai.css'));
const aiMetadata = [];
aiSource.walkAtRules('source', (rule) => { aiMetadata.push(rule.toString()); rule.remove(); });
write('packages/ai-elements/src/ai.css', `@import "./utilities.css";\n${aiSource.toString().trim()}\n`);
write('packages/ai-elements/src/ai.theme.css', `@import "./ai.css";\n${aiMetadata.join('\n')}\n`);
write('example/src/app.css', '@import "@svadmin/ui/app.css";\n@import "./compatibility.css";\n');
change('example/vite.config.ts', (s) => s.replace(/^import tailwindcss from ['"]@tailwindcss\/vite['"];?\r?\n/m, '').replace(/tailwindcss\(\),?\s*/g, ''));

const removed = new Set(['tailwindcss', '@tailwindcss/node', '@tailwindcss/vite', 'tw-animate-css', 'tailwind-variants', 'tailwind-merge']);
for (const file of ['packages/ui/package.json', 'packages/ai-elements/package.json', 'example/package.json']) json(file, (pkg) => {
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) for (const name of removed) if (pkg[section]) delete pkg[section][name];
  if (file.includes('/ui/')) {
    pkg.devDependencies['@pandacss/dev'] = version;
    pkg.scripts['build:styles'] = 'panda codegen && panda cssgen --outfile src/styled-system/styles.css && node scripts/flatten-panda-css.mjs';
    pkg.scripts.build = `bun run build:styles && ${pkg.scripts.build}`;
    pkg.scripts['test:css'] += ' scripts/panda-css.test.mjs';
    for (const name of ['design-contract', 'recipes']) pkg.exports[`./${name}`] = { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` };
    pkg.files.push('THIRD_PARTY_NOTICES.md', 'styles-compatibility.json');
  }
  if (file.includes('/ai-elements/')) {
    pkg.exports['./ai.theme.css'] = { style: './dist/ai.theme.css', default: './dist/ai.theme.css' };
    pkg.sideEffects = ['./dist/*.css'];
  }
  return pkg;
});
change('.gitignore', (s) => `${s}\n# Panda build products\npackages/ui/src/styled-system/\npackages/ui/src/styles/recipes.css\n`);
change('eslint.config.js', (s) => s.replace("'**/dist/**',", "'**/dist/**',\n      '**/styled-system/**',"));
rmSync('packages/ui/components.json');

change('packages/ai-elements/src/components/code/index.ts', (s) => {
  const exports = s.slice(s.indexOf('export { default,'));
  return `import { cn } from '../../utils.js';\n\nexport type CodeVariant = 'default' | 'secondary' | undefined;\n\n/** 保留公开调用方式，但不再依赖运行时样式变体引擎。 */\nexport function codeVariants({ variant = 'default', class: className = '', className: extraClassName = '' }: { variant?: CodeVariant | null; class?: string; className?: string } = {}): string {\n  return cn('relative h-full overflow-auto rounded-md border text-foreground', variant === 'secondary' ? 'border-transparent bg-secondary' : variant === null ? '' : 'border-border bg-background', className, extraClassName);\n}\n\n${exports}`;
});
const licenses = ['tailwindcss', 'tw-animate-css'].map((name) => `## ${name}\n\n${read(`node_modules/${name}/LICENSE`)}\n`).join('\n');
write('packages/ui/THIRD_PARTY_NOTICES.md', `# Static CSS compatibility notices\n\nThe compatibility CSS was generated once from ${BASE}; no compiler is required by the package. Upstream license notices are retained below.\n\n${licenses}`);
change('packages/ai-elements/THIRD_PARTY_NOTICES.md', (s) => `${s}\n${licenses}`);

change('packages/ui/src/app-css.test.ts', (s) => s.replace("join(currentDir, 'app.css')", "join(currentDir, 'components.css')").replace("src/app.css (Tailwind source)", "native component CSS").replace("keeps @theme block so Tailwind v4 generates utility classes", "keeps compiler directives out of native component CSS").replace("expect(css).toContain('@theme');", "expect(css).not.toContain('@theme');").replace("registers the published component directory as its own Tailwind source", "does not require component source scanning").replace("expect(css).toContain('@source \"./components\";');", "expect(css).not.toContain('@source');").replace(".layout-clean-flat [data-svadmin-content-page] .bg-card'", ".layout-clean-flat [data-svadmin-content-page] .svadmin-u-cd0ad9a56558'"));
change('packages/ui/src/page-chrome-css.test.ts', (s) => s.replace("['layer', 'media']", "['layer', 'media', 'supports']"));
change('packages/ui/scripts/static-css.test.mjs', (s) => {
  s = s.replace("import { compile } from '@tailwindcss/node';\n", '');
  const start = s.indexOf("test('Tailwind hosts can compile");
  const end = s.indexOf("test('postbuild is idempotent", start);
  assert.ok(start >= 0 && end > start);
  return s.slice(0, start) + s.slice(end);
});
change('scripts/check-package-packs.ts', (s) => s.replace("path: 'dist/ai.css',\n        includes:", "path: 'dist/ai.theme.css',\n        includes:").replace("          '.svadmin-ai',\n", ''));
for (const file of ['README.md', 'packages/ui/README.md']) change(file, (s) => s.replace(/@import "tailwindcss";\n/g, '').replace(/@import "@svadmin\/ui\/app.theme.css";/g, '@import "@svadmin/ui/app.css";'));
change('packages/create-svadmin/src/index.ts', (s) => s.replace('Svelte 5 + Shadcn Svelte + TailwindCSS', 'Svelte 5 + Bits UI + precompiled Panda CSS'));

// 保持 v1 严格协议；新语义变体通过显式 opt-in 的 Catalog 提供。
change('packages/surface/src/builtin-schemas.ts', (s) => `import { surfaceDesignContract } from '@svadmin/ui/design-contract';\n${s}\nconst styledMetricProperties = {\n  tone: Type.Optional(Type.Union(surfaceDesignContract.metric.tone.map((value) => Type.Literal(value)))),\n  density: Type.Optional(Type.Union(surfaceDesignContract.metric.density.map((value) => Type.Literal(value)))),\n};\nexport const styledMetricPropsSchema = Type.Union([\n  Type.Object({ ...currencyMetric.properties, ...styledMetricProperties }, { additionalProperties: false }),\n  Type.Object({ ...otherMetric.properties, ...styledMetricProperties }, { additionalProperties: false }),\n]);\nexport const styledResourceTablePropsSchema = Type.Object({\n  ...resourceTablePropsSchema.properties,\n  density: Type.Optional(Type.Union(surfaceDesignContract.table.density.map((value) => Type.Literal(value)))),\n}, { additionalProperties: false });\n`);
change('packages/surface/src/types.ts', (s) => s.replace('  readonly propsSchema: TSchema;', '  readonly propsSchema: TSchema;\n  readonly description?: string;\n  readonly examples?: readonly JsonObject[];'));
change('packages/surface/src/catalog.ts', (s) => {
  s = s.replace('  barChartPropsSchema,', '  styledMetricPropsSchema,\n  styledResourceTablePropsSchema,\n  barChartPropsSchema,');
  s = s.replace('    widgetTypes.add(widget.type);', `    widgetTypes.add(widget.type);\n    if ((widget.examples?.length ?? 0) > 3) throw new Error('Catalog examples are limited to three per widget');\n    for (const example of widget.examples ?? []) {\n      if (!Value.Check(widget.propsSchema, example)) throw new Error('Invalid catalog example for ' + widget.type);\n    }`);
  return `${s}\nexport const STYLED_SURFACE_CATALOG_VERSION = 'svadmin/styled-v1' as const;\nexport const styledSurfaceCatalog = defineSurfaceCatalog({\n  version: STYLED_SURFACE_CATALOG_VERSION,\n  widgets: defaultSurfaceCatalog.widgets.map((widget) => {\n    if (widget.type === 'metric') return {\n      ...widget, propsSchema: styledMetricPropsSchema,\n      description: 'Numeric KPI; tone and density select prebuilt semantic styles, never CSS.',\n      examples: [{ label: 'Pending orders', format: 'number', tone: 'warning', density: 'compact' }],\n    };\n    if (widget.type === 'resource-table') return {\n      ...widget, propsSchema: styledResourceTablePropsSchema,\n      description: 'Read-only table; density is a prebuilt semantic variant.',\n      examples: [{ title: 'Inventory', columns: [{ field: 'name', label: 'Name' }], density: 'compact' }],\n    };\n    return widget;\n  }),\n});\n`;
});
change('packages/surface/src/svelte.ts', (s) => s.replace('  DEFAULT_SURFACE_CATALOG_VERSION,', '  DEFAULT_SURFACE_CATALOG_VERSION,\n  STYLED_SURFACE_CATALOG_VERSION,\n  styledSurfaceCatalog,'));
change('packages/surface/src/agent.ts', (s) => s.replace('  const widgetTypes =', `  const contracts = catalog.widgets.map(({ type, dataKind, propsSchema, description, examples }) => ({ type, dataKind, propsSchema, description, examples }));\n  const widgetTypes =`).replace('Allowed widget types: ${widgetTypes}.', 'Allowed widget types: ${widgetTypes}. Component contracts: ${JSON.stringify(contracts)}. Select only schema-enumerated semantic variants; never emit class names, CSS objects, tokens, or recipes.'));
change('packages/surface/src/components/MetricWidget.svelte', (s) => {
  s = s.replace("import { metricPropsSchema }", "import { styledMetricPropsSchema as metricPropsSchema }").replace("  import StatsCard", "  import { surfaceMetric } from '@svadmin/ui/recipes';\n  import StatsCard");
  s = s.replace('  const formattedValue =', `  const metricClasses = $derived(metricProps.tone !== undefined || metricProps.density !== undefined\n    ? surfaceMetric({ tone: metricProps.tone, density: metricProps.density }) : undefined);\n  const formattedValue =`);
  s = s.replace('<article aria-labelledby=', '<article class={metricClasses?.root} data-surface-tone={metricProps.tone} data-surface-density={metricProps.density} aria-labelledby=');
  s = s.replaceAll('<StatsCard label=', '<StatsCard class={metricClasses?.card} label=');
  s = s.replace('class="metric-description"', 'class={"metric-description " + (metricClasses?.description ?? "")}').replace('class="metric-state"', 'class={"metric-state " + (metricClasses?.state ?? "")}');
  s = s.replace('min-height: 6rem;', 'min-height: var(--svadmin-metric-state-height, 6rem);').replace('padding: 1.25rem;', 'padding: var(--svadmin-metric-state-padding, 1.25rem);');
  return s;
});
change('packages/surface/src/components/ResourceTableWidget.svelte', (s) => {
  s = s.replace("import { resourceTablePropsSchema }", "import { styledResourceTablePropsSchema as resourceTablePropsSchema }").replace("  import CardContent", "  import { surfaceTable } from '@svadmin/ui/recipes';\n  import CardContent");
  s = s.replace('  const records =', `  const tableClasses = $derived(tableProps.density === undefined ? undefined : surfaceTable({ density: tableProps.density }));\n  const records =`);
  s = s.replace('<Card>', '<Card class={tableClasses?.root} data-surface-density={tableProps.density}>').replace('<CardHeader>', '<CardHeader class={tableClasses?.header}>').replace('<CardContent>', '<CardContent class={tableClasses?.content}>');
  s = s.replace('<Table aria-label=', '<Table density={tableProps.density ?? "comfortable"} aria-label=').replace('<TableHead scope=', '<TableHead class={tableClasses?.head} scope=').replace('<TableCell>', '<TableCell class={tableClasses?.cell}>');
  s = s.replace(/class="(table-state[^\"]*)"/g, (_, classes) => `class={${JSON.stringify(classes + ' ')} + (tableClasses?.state ?? "")}`);
  return s.replace('min-height: 8rem;', 'min-height: var(--svadmin-table-state-height, 8rem);');
});
change('packages/ui/design/recipes.ts', (s) => s.replace("state: { padding: density === 'compact' ? 'sm' : 'lg', minHeight: density === 'compact' ? '4.5rem' : '6rem' }", "state: { '--svadmin-metric-state-padding': density === 'compact' ? '0.75rem' : '1.25rem', '--svadmin-metric-state-height': density === 'compact' ? '4.5rem' : '6rem' }").replace("state: { minHeight: density === 'compact' ? '6rem' : '8rem' }", "state: { '--svadmin-table-state-height': density === 'compact' ? '6rem' : '8rem' }"));
console.info('Panda migration source generation complete; baseline CSS semantic tree is identical.');
