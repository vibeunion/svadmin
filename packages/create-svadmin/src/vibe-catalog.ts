import fs from 'node:fs';
import path from 'node:path';
import catalog from '../blueprints/customer-workspace/svadmin.vibe.json';

export function searchVibePages(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return catalog.pages.filter(page => {
    const text = [page.id, page.intent, page.route, ...page.components, ...page.tags].join(' ').toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
}

function materialPath(packageRoot: string, relative: string): string {
  const root = fs.realpathSync(packageRoot);
  const file = fs.realpathSync(path.resolve(root, relative));
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Material escapes package: ${relative}`);
  return file;
}

function readMaterial(packageRoot: string, relative: string): string {
  return fs.readFileSync(materialPath(packageRoot, relative), 'utf8');
}

export function readVibePreview(packageRoot: string, id: string, viewport: 'desktop' | 'mobile'): Buffer {
  if (!catalog.pages.some(page => page.id === id)) throw new Error(`Unknown page: ${id}`);
  if (viewport !== 'desktop' && viewport !== 'mobile') throw new Error('Unknown viewport');
  const file = materialPath(packageRoot, `blueprints/customer-workspace/previews/${id}-${viewport}.png`);
  const descriptor = fs.openSync(file, 'r');
  try {
    const info = fs.fstatSync(descriptor);
    if (!info.isFile() || info.size > 4 * 1024 * 1024) throw new Error('Invalid preview size');
    const image = Buffer.alloc(info.size);
    const bytes = fs.readSync(descriptor, image, 0, image.length, 0);
    if (bytes !== image.length || !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new Error('Invalid preview PNG');
    }
    return image;
  } finally {
    fs.closeSync(descriptor);
  }
}

export function inspectVibePage(packageRoot: string, id: string) {
  const page = catalog.pages.find(item => item.id === id);
  if (!page) throw new Error(`Unknown page: ${id}. Run vibe catalog to list page IDs.`);
  const shared = [
    catalog.contracts, catalog.resources, catalog.provider, catalog.design,
    'src/demo/provider.ts',
    'src/features/customers/index.ts', 'src/features/customers/data.ts', 'src/App.svelte', 'ARCHITECTURE.md',
  ];
  const files = Object.fromEntries([page.source, ...shared].map(file => [
    file, readMaterial(packageRoot, `blueprints/customer-workspace/${file}`),
  ]));
  return {
    version: catalog.version,
    blueprint: catalog.id,
    page,
    files,
    generatedFiles: {
      [catalog.selection]: { generatedBy: 'vibe init --preset <preset>', presets: catalog.presets },
    },
    guidance: {
      'DESIGN.md': readMaterial(packageRoot, 'guidance/DESIGN.md'),
      'AGENTS.md': readMaterial(packageRoot, 'guidance/AGENTS.md'),
    },
    componentApi: catalog.componentApi,
    states: catalog.states,
    acceptance: catalog.acceptance,
    boundaries: catalog.boundaries,
    previews: {
      desktop: `previews/${page.id}-desktop.png`,
      mobile: `previews/${page.id}-mobile.png`,
      note: catalog.previews.note,
    },
    usage: 'Read-only reference context, not a standalone installable page. Run vibe init for the complete starter. Read the installed component declarations and current customer code before editing.',
  };
}
