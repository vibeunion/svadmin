export interface ManifestChunk {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  isEntry?: boolean;
  isDynamicEntry?: boolean;
}

export type Manifest = Record<string, ManifestChunk>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** App 虽被动态导入，但入口立即加载它，因此必须计入启动预算。 */
export function collectExampleStartupFiles(manifest: Manifest, javascriptAssets: readonly string[]): Set<string> {
  const entries = Object.values(manifest).filter(chunk => chunk.isEntry);
  const entry = entries[0];
  assert(entries.length === 1 && entry, 'Example manifest must have exactly one entry chunk');
  const appKey = 'src/App.svelte';
  const app = manifest[appKey];
  assert(app?.isDynamicEntry && entry.dynamicImports?.includes(appKey),
    'Example entry must dynamically load the startup App');
  assert(entry.dynamicImports.length === 1, 'Unexpected bootstrap dynamic import requires explicit startup budgeting');

  const initialFiles = new Set<string>();
  const visited = new Set<ManifestChunk>();
  function collect(chunk: ManifestChunk): void {
    if (visited.has(chunk)) return;
    visited.add(chunk);
    initialFiles.add(chunk.file);
    for (const key of chunk.imports ?? []) {
      const imported = manifest[key];
      assert(imported, `Example manifest references missing import ${key}`);
      collect(imported);
    }
  }
  collect(entry);
  collect(app);

  const editors = Object.entries(manifest).filter(([key]) =>
    key.endsWith('/packages/editor/dist/components/Editor.svelte'));
  const editor = editors[0];
  assert(editors.length === 1 && editor, 'Example manifest must have exactly one lazy rich-text editor entry');
  const [editorKey, editorChunk] = editor;
  assert(editorChunk.isDynamicEntry && app.dynamicImports?.includes(editorKey),
    'Startup App must load the rich-text editor through a dynamic import');
  assert(!initialFiles.has(editorChunk.file), 'Rich-text editor leaked into the initial JavaScript dependency graph');

  for (const prefix of ['editor-tiptap-', 'editor-prosemirror-', 'editor-support-']) {
    const assets = javascriptAssets.filter(name => name.startsWith(prefix));
    assert(assets.length > 0, `Example build produced no ${prefix} chunk`);
    for (const asset of assets) {
      assert(!initialFiles.has(`assets/${asset}`),
        `${asset} leaked into the initial JavaScript dependency graph`);
    }
  }
  return initialFiles;
}
