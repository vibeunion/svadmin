import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

interface ManifestChunk {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  isEntry?: boolean;
  isDynamicEntry?: boolean;
}

type Manifest = Record<string, ManifestChunk>;

const repositoryRoot = resolve(import.meta.dir, '..');
const outputDirectory = join(repositoryRoot, 'example', 'dist');
const assetsDirectory = join(outputDirectory, 'assets');
const manifestPath = join(outputDirectory, '.vite', 'manifest.json');
const maximumChunkBytes = 500_000;
const maximumInitialBytes = 1_200_000;
const maximumInitialGzipBytes = 350_000;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assetNames = await readdir(assetsDirectory);
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js')).sort();
assert(javascriptAssets.length > 0, 'Example build produced no JavaScript assets');

const cssAssets = assetNames.filter((name) => name.endsWith('.css')).sort();
assert(cssAssets.length > 0, 'Example build produced no CSS assets');
const emittedCss = await Promise.all(
  cssAssets.map((assetName) => readFile(join(assetsDirectory, assetName), 'utf8')),
).then((contents) => contents.join('\n'));

for (const [label, selector] of [
  ['expanded sidebar width variable', '--svadmin-sidebar-width:224px'],
  ['collapsed sidebar width variable', '--svadmin-sidebar-collapsed-width:60px'],
  ['header height variable', '--svadmin-header-height:50px'],
  ['expanded content offset', 'margin-left:var(--svadmin-sidebar-width)'],
  ['collapsed content offset', 'margin-left:var(--svadmin-sidebar-collapsed-width)'],
  ['table shell selector', '[data-svadmin-table-card]'],
] as const) {
  assert(emittedCss.includes(selector), `Example CSS is missing ${label} ${selector}`);
}

let largestChunk = { name: '', size: 0 };
for (const assetName of javascriptAssets) {
  const size = (await stat(join(assetsDirectory, assetName))).size;
  if (size > largestChunk.size) largestChunk = { name: assetName, size };
  assert(
    size <= maximumChunkBytes,
    `${assetName} is ${size} bytes, exceeding the ${maximumChunkBytes}-byte chunk budget`,
  );
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
assert(entry, 'Example build manifest has no entry chunk');

const initialFiles = new Set<string>();
function collectInitialFiles(chunk: ManifestChunk): void {
  if (initialFiles.has(chunk.file)) return;
  initialFiles.add(chunk.file);
  for (const importKey of chunk.imports ?? []) {
    const importedChunk = manifest[importKey];
    assert(importedChunk, `Example manifest references missing import ${importKey}`);
    collectInitialFiles(importedChunk);
  }
}
collectInitialFiles(entry);

const editorEntryRecord = Object.entries(manifest).find(([key]) =>
  key.endsWith('/packages/editor/dist/components/Editor.svelte')
);
assert(editorEntryRecord, 'Example manifest has no lazy rich-text editor entry');
const [editorEntryKey, editorEntry] = editorEntryRecord;
assert(editorEntry.isDynamicEntry, 'Rich-text editor must remain a dynamic entry');
assert(
  entry.dynamicImports?.includes(editorEntryKey),
  'Example entry must load the rich-text editor through a dynamic import',
);

for (const editorChunkPrefix of ['editor-tiptap-', 'editor-prosemirror-', 'editor-support-']) {
  const editorAsset = javascriptAssets.find((name) => name.startsWith(editorChunkPrefix));
  assert(editorAsset, `Example build produced no ${editorChunkPrefix} chunk`);
  assert(
    !initialFiles.has(`assets/${editorAsset}`),
    `${editorAsset} leaked into the initial JavaScript dependency graph`,
  );
}

let initialBytes = 0;
let initialGzipBytes = 0;
for (const file of initialFiles) {
  const content = await readFile(join(outputDirectory, file));
  initialBytes += content.byteLength;
  initialGzipBytes += gzipSync(content).byteLength;
}

assert(
  initialBytes <= maximumInitialBytes,
  `Initial JavaScript is ${initialBytes} bytes, exceeding the ${maximumInitialBytes}-byte budget`,
);
assert(
  initialGzipBytes <= maximumInitialGzipBytes,
  `Initial gzip JavaScript is ${initialGzipBytes} bytes, exceeding the ${maximumInitialGzipBytes}-byte budget`,
);

console.info(
  `Example bundle verified: ${javascriptAssets.length} chunks, ` +
  `${initialBytes} initial bytes (${initialGzipBytes} gzip), ` +
  `largest ${largestChunk.name} is ${largestChunk.size} bytes`,
);
