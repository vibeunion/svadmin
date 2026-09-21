import { expect, test } from 'bun:test';
import { collectExampleStartupFiles, type Manifest } from './example-bundle-contract';
import { requireValue } from './test-assertions';

const editorKey = '../packages/editor/dist/components/Editor.svelte';
const assets = ['editor-tiptap-a.js', 'editor-prosemirror-a.js', 'editor-support-a.js'];
function fixture(): Manifest {
  return {
    'index.html': { file: 'assets/index.js', isEntry: true, imports: ['runtime'], dynamicImports: ['src/App.svelte'] },
    'src/App.svelte': { file: 'assets/App.js', isDynamicEntry: true, imports: ['runtime', 'core', 'index.html'], dynamicImports: [editorKey, 'page'] },
    runtime: { file: 'assets/runtime.js' },
    core: { file: 'assets/core.js', imports: ['runtime'] },
    page: { file: 'assets/page.js', isDynamicEntry: true },
    [editorKey]: { file: 'assets/Editor.js', isDynamicEntry: true, imports: ['src/App.svelte', 'tiptap'] },
    tiptap: { file: 'assets/editor-tiptap-a.js' },
  };
}

test('startup includes App and its static closure once, excluding lazy pages and editor', () => {
  expect([...collectExampleStartupFiles(fixture(), assets)].sort()).toEqual([
    'assets/App.js', 'assets/core.js', 'assets/index.js', 'assets/runtime.js',
  ]);
});

test('missing static references and unbudgeted bootstrap imports fail closed', () => {
  const missing = fixture();
  delete missing.core;
  expect(() => collectExampleStartupFiles(missing, assets)).toThrow('missing import core');
  const extra = fixture();
  requireValue(extra['index.html']).dynamicImports = ['src/App.svelte', 'page'];
  expect(() => collectExampleStartupFiles(extra, assets)).toThrow('startup budgeting');
});

test('both startup App and Editor must retain their actual dynamic edges', () => {
  const noApp = fixture();
  requireValue(noApp['index.html']).dynamicImports = [];
  expect(() => collectExampleStartupFiles(noApp, assets)).toThrow('startup App');
  const noEditor = fixture();
  requireValue(noEditor['src/App.svelte']).dynamicImports = ['page'];
  expect(() => collectExampleStartupFiles(noEditor, assets)).toThrow('dynamic import');
  const staticEditor = fixture();
  requireValue(staticEditor[editorKey]).isDynamicEntry = false;
  expect(() => collectExampleStartupFiles(staticEditor, assets)).toThrow('dynamic import');
});

test('a static editor edge is rejected even when a dynamic edge also exists', () => {
  const manifest = fixture();
  requireValue(manifest.core).imports = [editorKey];
  expect(() => collectExampleStartupFiles(manifest, assets)).toThrow('Rich-text editor leaked');
});

test('every heavy editor asset stays outside the startup closure', () => {
  for (const asset of [...assets, 'editor-support-second.js']) {
    const manifest = fixture();
    manifest.leak = { file: `assets/${asset}` };
    requireValue(manifest.core).imports = ['leak'];
    expect(() => collectExampleStartupFiles(manifest, [...assets, 'editor-support-second.js'])).toThrow(`${asset} leaked`);
  }
  expect(() => collectExampleStartupFiles(fixture(), assets.slice(1))).toThrow('no editor-tiptap-');
});
