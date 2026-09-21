import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { assertExampleLayoutCss } from './example-layout-contract.js';
import { collectExampleStartupFiles, type Manifest } from './example-bundle-contract.js';

const repositoryRoot = resolve(import.meta.dir, '..');
const outputDirectory = join(repositoryRoot, 'example', 'dist');
const assetsDirectory = join(outputDirectory, 'assets');
const manifestPath = join(outputDirectory, '.vite', 'manifest.json');
const maximumChunkBytes = 1_250_000;
const maximumInitialBytes = 1_400_000;
const maximumInitialGzipBytes = 375_000;

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
