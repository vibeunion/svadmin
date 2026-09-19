#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import C from './core.cjs';
const root = path.dirname(fileURLToPath(import.meta.url));
export function preparePlugin(id, out) {
  C.assert(typeof id === 'string' && /^[0-9]{10,30}$/.test(id), 'Use the numeric plugin ID assigned by Figma: Plugins > Development > New plugin');
  const dest = path.resolve(out), manifest = JSON.parse(readFileSync(path.join(root, 'plugin/manifest.template.json'), 'utf8'));
  const core = readFileSync(path.join(root, 'core.cjs'), 'utf8'), runtime = readFileSync(path.join(root, 'runtime.cjs'), 'utf8');
  const ui = readFileSync(path.join(root, 'plugin/ui.html'), 'utf8').replace('/*__CORE__*/', () => core);
  const main = `${core}\n${runtime}\nfigma.showUI(__html__, { width: 480, height: 740, themeColors: true });\nfigma.ui.onmessage = FigmaOfflineRuntime.createRuntime(figma).handle;\n`;
  mkdirSync(dest);
  try {
    for (const [name, value] of Object.entries({ 'manifest.json': JSON.stringify({ ...manifest, id }, null, 2) + '\n', 'code.js': main, 'ui.html': ui })) writeFileSync(path.join(dest, name), value, { flag: 'wx' });
  } catch (error) { rmSync(dest, { recursive: true, force: true }); throw error; }
  return dest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [flag, id, outFlag, out, ...rest] = process.argv.slice(2);
    C.assert(flag === '--id' && outFlag === '--out' && out && !rest.length, 'Usage: node design/figma-offline/prepare-plugin.mjs --id FIGMA_ASSIGNED_PLUGIN_ID --out NEW_DIRECTORY');
    console.info(preparePlugin(id, out));
  } catch (error) { console.error(`Figma offline: ${error.message}`); process.exitCode = 1; }
}
