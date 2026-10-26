import fs from 'node:fs';
import path from 'node:path';
import { createProjectPackageJson, type ScaffoldManifest } from './project-manifest';
import { buildAdminAiManifest, buildAdminSchemaJson } from './scaffold-platform';
import { resources, uiOnlyResources } from '../blueprints/customer-workspace/src/resources';
import { inspectVibePage, searchVibePages } from './vibe-catalog';
import { parseProductPlan, type ProductPlan } from '@svadmin/core/product-plan';
import { formatProductPreview, runProductPipeline } from '@svadmin/core/product-pipeline';
import { reviewProductPlan } from '@svadmin/core/product-review';

const PRESETS = ['operations', 'enterprise', 'collaboration'] as const;
export type VibePreset = typeof PRESETS[number];
export type VibeFiles = Record<string, string | Buffer>;

export function parseVibeArguments(args: string[]) {
  const [command, ...rest] = args;
  if (command === 'mcp' && rest.length === 0) return { command } as const;
  if (command === 'catalog' && rest.length === 0) return { command } as const;
  if (command === 'plan' || command === 'review') {
    const positional: string[] = [];
    const roleIds: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === undefined) continue;
      if (arg === '--role') {
        const roleId = rest[++i];
        if (!roleId?.trim()) throw new Error(`Missing value for --role`);
        roleIds.push(roleId);
      } else if (arg.startsWith('-')) {
        throw new Error(`Unknown option: ${arg}`);
      } else {
        positional.push(arg);
      }
    }
    if (positional.length !== 1) throw new Error(`vibe ${command} requires exactly one product plan JSON file`);
    const planFile = positional[0];
    if (planFile === undefined) throw new Error('Missing product plan JSON file');
    return { command, planFile: path.resolve(planFile), roleIds } as const;
  }
  if (command === 'catalog' && rest.length === 2 && rest[0] === '--query' && rest[1]?.trim()) {
    return { command, query: rest[1] } as const;
  }
  if (command === 'inspect' && rest.length === 1 && rest[0] && !rest[0].startsWith('-')) {
    return { command, page: rest[0] } as const;
  }
  if (command !== 'init') throw new Error('Usage: vibe mcp | vibe catalog [--query <keywords>] | vibe inspect <page> | vibe plan <product-plan.json> [--role <role-id>] | vibe review <product-plan.json> | vibe init <directory> [--preset operations|enterprise|collaboration] [--product-plan <file>] [--role <role-id>] [--write]');
  let preset: VibePreset = 'enterprise';
  let write = false;
  let productPlanFile: string | undefined;
  const roleIds: string[] = [];
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === undefined) continue;
    if (arg === '--write') write = true;
    else if (arg === '--preset') {
      const value = rest[++i];
      if (!PRESETS.some(p => p === value)) throw new Error(`Unknown design preset: ${value ?? '(missing)'}`);
      preset = value as VibePreset;
    } else if (arg === '--product-plan' || arg === '--plan') {
      const value = rest[++i];
      if (!value?.trim()) throw new Error(`Missing value for ${arg}`);
      productPlanFile = path.resolve(value);
    } else if (arg === '--role') {
      const value = rest[++i];
      if (!value?.trim()) throw new Error('Missing value for --role');
      roleIds.push(value);
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) throw new Error('vibe init requires exactly one new project directory');
  const directory = positional[0];
  if (directory === undefined) throw new Error('Missing project directory');
  return { command, directory: path.resolve(directory), preset, write, productPlanFile, roleIds } as const;
}

function readTree(directory: string, prefix = ''): VibeFiles {
  const files: VibeFiles = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(files, readTree(file, relative));
    else if (entry.isFile()) files[relative] = entry.name.endsWith('.png')
      ? fs.readFileSync(file) : fs.readFileSync(file, 'utf8');
    else throw new Error(`Unsupported blueprint entry: ${file}`);
  }
  return files;
}


interface VibeProductOptions {
  readonly productPlan?: ProductPlan;
  readonly roleIds?: readonly string[];
}

function productRoute(surface: ProductPlan['surfaces'][number]): string {
  return surface.route ?? '/workflows/' + surface.id;
}

function buildProductGeneratedFiles(plan: ProductPlan, selectedRoleIds: readonly string[]): VibeFiles {
  const allRoleIds = plan.roles.map(role => role.id);
  const roleIds = selectedRoleIds.length ? selectedRoleIds : allRoleIds;
  const planJson = JSON.stringify(plan, null, 2);
  const summary = [
    '# ' + plan.brief.name,
    '',
    plan.brief.description,
    '',
    '## Primary outcome\n' + plan.brief.primaryOutcome,
    '## Audience\n' + plan.brief.primaryAudience,
    '## Roles\n' + (plan.roles.map(role => '- **' + role.name + '** (' + role.id + ')：' + (role.description ?? '未提供描述')).join('\n') || '- 未定义角色'),
    '## Workflows\n' + (plan.workflows.map(workflow => '- **' + workflow.name + '**：' + workflow.goal + '（' + workflow.priority + ' / ' + workflow.frequency + '）').join('\n') || '- 未定义工作流'),
    '## Surfaces\n' + (plan.surfaces.map(surface => '- **' + surface.name + '**：' + productRoute(surface) + '，' + surface.purpose).join('\n') || '- 未定义页面'),
    '## Menu\n' + (plan.menu.map(item => '- ' + item.label + '（' + item.placement + '）').join('\n') || '- 未定义菜单入口'),
    '## Generation notes',
    '- Generated resources are read-only metadata until an explicit contract is added.',
    '- Product actions are metadata and do not imply backend mutations.',
    '- Initial visible roles: ' + (roleIds.join(', ') || 'all') + '.',
  ].join('\n\n') + '\n';
  const resourcesSource = [
    "import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';",
    "import { productPlan } from './product-plan';",
    "",
    "const supportedFieldTypes = new Set<string>(['text','number','boolean','date','time','datetime','daterange','select','multiselect','tags','textarea','richtext','image','images','json','relation','color','url','email','phone','currency','percent','file','markdown','password','array','tree-select','treeselect','cascader','transfer','rate','rating','avatar','copy','code']);",
    "function toFieldType(type: string): FieldDefinition['type'] {",
    "  return (supportedFieldTypes.has(type) ? type : 'text') as FieldDefinition['type'];",
    "}",
    "function toField(field: (typeof productPlan.resources)[number]['fields'][number]): FieldDefinition {",
    "  const hidden = field.sensitive === true || field.disclosure === 'hidden';",
    "  return { key: field.id, label: field.label, type: toFieldType(field.type), required: field.required, showInList: !hidden, showInShow: !hidden, showInForm: !hidden, showInCreate: !hidden, showInEdit: !hidden };",
    "}",
    "export const productResources: ResourceDefinition[] = productPlan.resources.map(resource => ({",
    "  name: resource.runtimeName ?? resource.name, label: resource.label,",
    "  icon: resource.menuPlacement === 'settings' ? 'settings' : undefined,",
    "  fields: resource.fields.map(toField), canCreate: false, canEdit: false, canDelete: false, canShow: true,",
    "  showInMenu: resource.internal !== true && resource.menuPlacement !== 'hidden' && resource.menuPlacement !== 'context' && resource.menuPlacement !== 'command',",
    "}));",
    "",
  ].join('\n');
  const generatedPlan = [
    "import { parseProductPlan, type ProductPlan } from '@svadmin/core/product-plan';",
    "",
    "export const productPlan: ProductPlan = parseProductPlan(" + planJson + ");",
    "",
  ].join('\n');
  const generatedNavigation = [
    "import type { MenuItem } from '@svadmin/core';",
    "import { buildProductMenuItems } from '@svadmin/core/product-navigation';",
    "import { productPlan } from './product-plan';",
    "",
    "export const ALL_PRODUCT_ROLE_IDS = " + JSON.stringify(allRoleIds) + " as const;",
    "export const INITIAL_PRODUCT_ROLE_IDS = " + JSON.stringify(roleIds) + " as const;",
    "export function createProductMenu(roleIds: readonly string[] = INITIAL_PRODUCT_ROLE_IDS, featureFlags: Readonly<Record<string, boolean>> = {}): MenuItem[] {",
    "  return buildProductMenuItems(productPlan, { roleIds, featureFlags });",
    "}",
    "export const productMenu = createProductMenu();",
    "",
  ].join('\n');
  const generatedPages = [
    "import { runProductPipeline } from '@svadmin/core/product-pipeline';",
    "import { productPlan } from './product-plan';",
    "import { INITIAL_PRODUCT_ROLE_IDS } from './navigation';",
    "",
    "export const productPipeline = runProductPipeline({ plan: productPlan, navigation: { roleIds: [...INITIAL_PRODUCT_ROLE_IDS] } });",
    "export const productPagePlans = productPipeline.pages;",
    "export const productSurfaceRoutes = Object.fromEntries(productPlan.surfaces.map(surface => [surface.route ?? '/workflows/' + surface.id, surface.id])) as Record<string, string>;",
    "",
  ].join('\n');
  const generatedRoutes = [
    "import type { AdminPageRoute } from '@svadmin/ui';",
    "import ProductSurfacePage from '../ProductSurfacePage.svelte';",
    "import { productSurfaceRoutes } from './pages';",
    "",
    "export const productPageRoutes: readonly AdminPageRoute[] = Object.keys(productSurfaceRoutes).map(path => ({ path, component: ProductSurfacePage }));",
    "",
  ].join('\n');
  return {
    'svadmin.product.json': planJson + '\n',
    'PRODUCT.md': summary,
    'src/generated/product-plan.ts': generatedPlan,
    'src/generated/resources.ts': resourcesSource,
    'src/generated/navigation.ts': generatedNavigation,
    'src/generated/pages.ts': generatedPages,
    'src/generated/page-routes.ts': generatedRoutes,
    'src/generated/README.md': 'Generated product files. Derived from svadmin.product.json; regenerate instead of editing by hand.\n',
  };
}

export function planVibeProject(packageRoot: string, manifest: ScaffoldManifest, preset: VibePreset, options: VibeProductOptions = {}) {
  const blueprint = path.join(packageRoot, options.productPlan ? 'blueprints/product-workspace' : 'blueprints/customer-workspace');
  const files = readTree(blueprint);
  const template = path.join(packageRoot, 'template');
  for (const name of ['index.html', 'svelte.config.js', 'tsconfig.json', 'vite.config.ts', 'src/main.ts', 'src/vite-env.d.ts']) {
    files[name] = fs.readFileSync(path.join(template, name), 'utf8');
  }
  for (const patch of Object.values(manifest.patchedDependencies ?? {})) {
    files[patch] = fs.readFileSync(path.join(template, patch), 'utf8');
  }
  files['DESIGN.md'] = fs.readFileSync(path.join(packageRoot, 'guidance/DESIGN.md'), 'utf8');
  files['AGENTS.md'] = fs.readFileSync(path.join(packageRoot, 'guidance/AGENTS.md'), 'utf8');
  files['PRODUCT.md'] = fs.readFileSync(path.join(packageRoot, 'guidance/PRODUCT.md'), 'utf8');
  if (options.productPlan) Object.assign(files, buildProductGeneratedFiles(options.productPlan, options.roleIds ?? []));
  const skill = files['vibe-skill.md'];
  if (typeof skill !== 'string') throw new Error('The shipped vibe skill is missing');
  files['.agents/skills/svadmin-vibe/SKILL.md'] = skill;
  delete files['vibe-skill.md'];
  if (!options.productPlan) files['src/design-selection.ts'] = `export const initialPreset = '${preset}' as const;\n`;
  const pkg = createProjectPackageJson(manifest, {
    projectName: options.productPlan ? 'svadmin-product-workspace' : 'svadmin-customer-workspace', dataProvider: 'none', authProvider: 'none',
  });
  pkg.devDependencies['@playwright/test'] = '^1.62.1';
  pkg.devDependencies['csstype'] = '^3.2.3';
  pkg.scripts['test:ui'] = 'playwright test';
  pkg.scripts['check:architecture'] = 'node scripts/check-architecture.mjs';
  pkg.scripts['check'] = `bun run check:architecture && ${pkg.scripts['check']}`;
  files['package.json'] = `${JSON.stringify(pkg, null, 2)}\n`;
  const ai = buildAdminAiManifest({
    projectName: pkg.name, dataProvider: 'none', authProvider: 'none',
    ...(manifest.dependencies['@svadmin/core'] === undefined ? {} : { coreVersionRange: manifest.dependencies['@svadmin/core'] }),
  });
  if (options.productPlan) {
    ai.resources = options.productPlan.resources.map(resource => ({ name: resource.runtimeName ?? resource.name, label: resource.label, fields: resource.fields.map(field => ({ key: field.id, label: field.label, type: field.type, required: field.required ?? false })), operations: ['list', 'show'] }));
    ai.routes = options.productPlan.surfaces.map(surface => ({ resource: surface.resourceIds[0] ?? '', path: productRoute(surface), operations: ['list', 'show'] }));
  } else {
  ai.resources = resources.map(resource => ({
    name: resource.name, label: resource.label ?? resource.name,
    fields: (resource.fields ?? []).map(field => ({
      key: field.key, label: field.label, type: field.type, required: field.required ?? false,
    })),
    operations: uiOnlyResources.includes(resource.name) ? [] : [
      'list',
      ...(resource.canShow === false ? [] : ['show']),
      ...(resource.canCreate === false ? [] : ['create']),
      ...(resource.canEdit === false ? [] : ['edit']),
    ],
  }));
  ai.routes = ai.resources.map(resource => ({
    resource: resource.name, path: `/${resource.name}`,
    operations: uiOnlyResources.includes(resource.name) ? ['list'] : resource.operations,
  }));
  }
  ai.providers.data = { choice: 'none', package: null, capabilities: ['in-memory-demo', 'data', 'filter', 'sort', 'pagination'] };
  ai.project.commands = pkg.scripts;
  ai.project.testCommand = 'bun run test:ui';
  ai.guidance = [...ai.guidance, 'PRODUCT.md', 'svadmin.vibe.json', 'ARCHITECTURE.md', '.agents/skills/svadmin-vibe/SKILL.md'];
  files['svadmin.ai.json'] = `${JSON.stringify(ai, null, 2)}\n`;
  files['svadmin.schema.json'] = `${JSON.stringify(buildAdminSchemaJson(), null, 2)}\n`;
  files['.gitignore'] = 'node_modules/\ndist/\n.env\n.env.*\n!.env.example\nplaywright-report/\ntest-results/\n';
  return files;
}

export function writeVibeProject(directory: string, files: VibeFiles): void {
  const root = path.resolve(directory);
  for (const relative of Object.keys(files)) {
    if (!path.resolve(root, relative).startsWith(`${root}${path.sep}`)) {
      throw new Error(`Blueprint path escapes the project: ${relative}`);
    }
  }
  // 只允许新目录；已存在的目标（含符号链接）由 mkdir 拒绝。
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  fs.mkdirSync(directory);
  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(directory, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content, { flag: 'wx' });
  }
}

export async function vibeCommand(args: string[], packageRoot: string, manifest: ScaffoldManifest): Promise<void> {
  const options = parseVibeArguments(args);
  if (options.command === 'mcp') {
    const { serveVibeMcp } = await import('./vibe-mcp');
    const metadata: unknown = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    const version = typeof metadata === 'object' && metadata !== null ? Reflect.get(metadata, 'version') : undefined;
    if (typeof version !== 'string') throw new Error('Missing shipped CLI version');
    await serveVibeMcp(packageRoot, version);
    return;
  }
  if (options.command === 'catalog') {
    const query = 'query' in options && typeof options.query === 'string' ? options.query : undefined;
    console.log(query !== undefined
      ? JSON.stringify({ query, pages: searchVibePages(query) }, null, 2)
      : fs.readFileSync(path.join(packageRoot, 'blueprints/customer-workspace/svadmin.vibe.json'), 'utf8'));
    return;
  }
  if (options.command === 'inspect') {
    console.log(JSON.stringify(inspectVibePage(packageRoot, options.page), null, 2));
    return;
  }
  if (options.command === 'review' || options.command === 'plan') {
    const input = JSON.parse(fs.readFileSync(options.planFile, 'utf8')) as unknown;
    const plan = parseProductPlan(input);
    if (options.command === 'review') {
      console.log(JSON.stringify(reviewProductPlan(plan), null, 2));
      return;
    }
    const roleIds = options.roleIds.length ? options.roleIds : plan.roles.map(role => role.id);
    console.log(formatProductPreview(runProductPipeline({ plan, navigation: { roleIds } })));
    return;
  }
  if (options.command !== 'init') throw new Error('Unsupported vibe command');
  if (fs.existsSync(options.directory)) throw new Error('The target already exists. Choose a new directory; existing projects are never overwritten.');
  let productPlan: ProductPlan | undefined;
  if (options.productPlanFile) {
    const input = JSON.parse(fs.readFileSync(options.productPlanFile, 'utf8')) as unknown;
    productPlan = parseProductPlan(input);
    const report = reviewProductPlan(productPlan);
    if (!report.ok) throw new Error('Product plan review failed:\n' + JSON.stringify(report, null, 2));
    if (report.issues.length) console.warn('Product plan review warnings: ' + report.issues.length);
  }
  const productOptions: VibeProductOptions = { roleIds: options.roleIds, ...(productPlan === undefined ? {} : { productPlan }) };
  const files = planVibeProject(packageRoot, manifest, options.preset, productOptions);
  console.log(`svadmin vibe: ${productPlan ? 'product-workspace' : 'customer-workspace'} / ${options.preset}\n${options.directory}`);
  for (const file of Object.keys(files).sort()) console.log(`  add ${file}`);
  if (!options.write) {
    console.log('Dry run only. Re-run with --write to create the project.');
    return;
  }
  writeVibeProject(options.directory, files);
  console.log('Created. In the project directory run: bun install, bun run check, bun run dev.');
  console.log('UI acceptance: bunx playwright install chromium && bun run test:ui');
  console.log('Demo data is in memory only. Review README.md before connecting a real provider.');
}
