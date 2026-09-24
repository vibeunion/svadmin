import fs from 'node:fs';
import path from 'node:path';
import { createProjectPackageJson, type ScaffoldManifest } from './project-manifest';
import { buildAdminAiManifest, buildAdminSchemaJson } from './scaffold-platform';
import { resources, uiOnlyResources } from '../blueprints/customer-workspace/src/resources';
import { inspectVibePage, searchVibePages } from './vibe-catalog';

const PRESETS = ['operations', 'enterprise', 'collaboration'] as const;
export type VibePreset = typeof PRESETS[number];
export type VibeFiles = Record<string, string | Buffer>;

export function parseVibeArguments(args: string[]) {
  const [command, ...rest] = args;
  if (command === 'mcp' && rest.length === 0) return { command } as const;
  if (command === 'catalog' && rest.length === 0) return { command } as const;
  if (command === 'catalog' && rest.length === 2 && rest[0] === '--query' && rest[1]?.trim()) {
    return { command, query: rest[1] } as const;
  }
  if (command === 'inspect' && rest.length === 1 && rest[0] && !rest[0].startsWith('-')) {
    return { command, page: rest[0] } as const;
  }
  if (command !== 'init') throw new Error('Usage: vibe mcp | vibe catalog [--query <keywords>] | vibe inspect <page> | vibe init <directory> [--preset operations|enterprise|collaboration] [--write]');
  let preset: VibePreset = 'enterprise';
  let write = false;
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === undefined) continue;
    if (arg === '--write') write = true;
    else if (arg === '--preset') {
      const value = rest[++i];
      if (!PRESETS.some(p => p === value)) throw new Error(`Unknown design preset: ${value ?? '(missing)'}`);
      preset = value as VibePreset;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) throw new Error('vibe init requires exactly one new project directory');
  const directory = positional[0];
  if (directory === undefined) throw new Error('Missing project directory');
  return { command, directory: path.resolve(directory), preset, write } as const;
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

export function planVibeProject(packageRoot: string, manifest: ScaffoldManifest, preset: VibePreset) {
  const blueprint = path.join(packageRoot, 'blueprints/customer-workspace');
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
  const skill = files['vibe-skill.md'];
  if (typeof skill !== 'string') throw new Error('The shipped vibe skill is missing');
  files['.agents/skills/svadmin-vibe/SKILL.md'] = skill;
  delete files['vibe-skill.md'];
  files['src/design-selection.ts'] = `export const initialPreset = '${preset}' as const;\n`;
  const pkg = createProjectPackageJson(manifest, {
    projectName: 'svadmin-customer-workspace', dataProvider: 'none', authProvider: 'none',
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
  ai.providers.data = { choice: 'none', package: null, capabilities: ['in-memory-demo', 'data', 'filter', 'sort', 'pagination'] };
  ai.project.commands = pkg.scripts;
  ai.project.testCommand = 'bun run test:ui';
  ai.guidance = [...ai.guidance, 'svadmin.vibe.json', 'ARCHITECTURE.md', '.agents/skills/svadmin-vibe/SKILL.md'];
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
    console.log('query' in options
      ? JSON.stringify({ query: options.query, pages: searchVibePages(options.query) }, null, 2)
      : fs.readFileSync(path.join(packageRoot, 'blueprints/customer-workspace/svadmin.vibe.json'), 'utf8'));
    return;
  }
  if (options.command === 'inspect') {
    console.log(JSON.stringify(inspectVibePage(packageRoot, options.page), null, 2));
    return;
  }
  if (fs.existsSync(options.directory)) throw new Error('The target already exists. Choose a new directory; existing projects are never overwritten.');
  const files = planVibeProject(packageRoot, manifest, options.preset);
  console.log(`svadmin vibe: customer-workspace / ${options.preset}\n${options.directory}`);
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
