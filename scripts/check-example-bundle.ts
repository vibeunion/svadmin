import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { assertExampleLayoutCss } from './example-layout-contract.js';
import { collectExampleStartupFiles, type Manifest } from './example-bundle-contract.js';

const repositoryRoot = resolve(import.meta.dir, '..');
const outputDirectory = join(repositoryRoot, 'example', 'dist');
const assetsDirectory = join(outputDirectory, 'assets');
const manifestPath = join(outputDirectory, '.vite', 'manifest.json');
// Mermaid 12 bundles a larger ELK layout chunk (1,498,950 bytes) but remains lazy.
const maximumChunkBytes = 1_550_000;
const maximumInitialBytes = 1_420_000;
// Enterprise closeout measured 390055 gzip bytes on 2026-10-26; the released
// enterprise feedback changes measured 390223 gzip bytes on 2026-10-27, and the
// unified visual system measured 390547 gzip bytes on 2026-10-29, and the shell
// presets plus notification and appearance panels measured 399989 gzip bytes on
// 2026-10-29. The enterprise component suite in PR #686 measured 401661 gzip
// bytes after the release baseline, and the typography/fullscreen controls in
// PR #681 measured 402140 gzip bytes; PR #691 with enterprise workflow, org
// and excel suites measured 402903 gzip bytes. The tailwind-variants v4 upgrade
// ships its merge tables instead of the separate tailwind-merge peer and measured
// 407081 gzip bytes. Copy formatting for numbers, dates and ellipsis measured
// 408538 gzip bytes on 2026-11-14. Notification drawer and enterprise suite
// in PR #795 measured 422803 gzip bytes; keep a narrow headroom for runner variation.
const maximumInitialGzipBytes = 425_000;

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

assertExampleLayoutCss(emittedCss);

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
const initialFiles = collectExampleStartupFiles(manifest, javascriptAssets);

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
