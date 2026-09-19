#!/usr/bin/env node
import { readFileSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import C from './core.cjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function assetExtension(bytes, kind) {
  let ext = 'bin';
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ext = 'png';
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ext = 'jpg';
  else if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) ext = 'gif';
  else if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') ext = 'webp';
  C.assert(kind !== 'preview' || ext === 'png', 'Preview is not PNG');
  return ext;
}
export function analyze(input, out) {
  const inputPath = path.resolve(input), outputPath = path.resolve(out);
  C.assert(statSync(inputPath).isFile() && statSync(inputPath).size <= C.LIMITS.jsonBytes, 'Input exceeds 40 MiB limit or is not a file');
  const raw = readFileSync(inputPath); C.assert(raw.length <= C.LIMITS.jsonBytes, 'Input exceeds limit');
  C.assert(!inputPath.toLowerCase().endsWith('.fig'), 'Native .fig binary is not supported here. Export with the local Figma plugin; no unreviewed parser is auto-installed.');
  const bundle = JSON.parse(raw.toString('utf8')), summary = C.validateBundle(bundle), warnings = C.diagnostics(bundle);
  const decoded = bundle.assets.map((a, i) => {
    const bytes = Buffer.from(a.base64, 'base64'); C.assert(bytes.toString('base64') === a.base64, 'Non-canonical base64');
    const ext = assetExtension(bytes, a.kind);
    return { bytes, manifest: { id: a.id, kind: a.kind, nodeId: a.nodeId, imageHash: a.imageHash,
      path: `${a.kind === 'preview' ? 'previews' : 'images'}/${String(i + 1).padStart(4, '0')}.${ext}`, size: bytes.length, sha256: sha(bytes) } };
  });
  const inventory = [];
  for (const root of bundle.nodes) C.walk(root.document, n => {
    if (typeof n.id !== 'string' || typeof n.type !== 'string') return;
    if (['COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'TEXT', 'FRAME'].includes(n.type)) inventory.push({ id: n.id, name: n.name, type: n.type,
      componentId: n.componentId, componentProperties: n.componentProperties, componentPropertyDefinitions: n.componentPropertyDefinitions,
      boundVariables: n.boundVariables, layoutMode: n.layoutMode, width: n.absoluteBoundingBox?.width, height: n.absoluteBoundingBox?.height });
  });
  const report = { format: 'svadmin/figma-analysis-v1', sourceSha256: sha(raw), source: bundle.source, scope: bundle.scope, rights: bundle.rights,
    summary, warnings, inventory, limitations: ['Not a .fig backup or lossless round-trip', 'Missing remote references remain unresolved',
      'FLOAT variables have no inferred unit; no automatic DTCG or production-token overwrite', 'No assets are licensed or approved for redistribution by this tool'] };
  // 固定文件名与生成的资源路径，不使用设计图层名称或传入路径写磁盘。
  const files = { 'manifest.json': { format: bundle.format, sourceSha256: sha(raw), source: bundle.source, scope: bundle.scope, rights: bundle.rights, assets: decoded.map(a => a.manifest) },
    'nodes.json': bundle.nodes, 'variables.json': bundle.variables, 'styles.json': bundle.styles, 'warnings.json': warnings, 'analysis.json': report };
  mkdirSync(outputPath, { mode: 0o700 }); // 不递归、不覆盖已存在目录，也拒绝目录符号链接。
  try {
    mkdirSync(path.join(outputPath, 'images')); mkdirSync(path.join(outputPath, 'previews'));
    for (const [name, value] of Object.entries(files)) writeFileSync(path.join(outputPath, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    for (const a of decoded) writeFileSync(path.join(outputPath, a.manifest.path), a.bytes, { flag: 'wx', mode: 0o600 });
  } catch (error) { rmSync(outputPath, { recursive: true, force: true }); throw error; }
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, flag, out, ...rest] = process.argv.slice(2);
    C.assert(input && flag === '--out' && out && rest.length === 0, 'Usage: node design/figma-offline/analyze.mjs export.svfig.json --out NEW_DIRECTORY');
    const r = analyze(input, out); console.info(JSON.stringify({ sourceSha256: r.sourceSha256, ...r.summary, warnings: r.warnings.length, out: path.resolve(out) }, null, 2));
  } catch (error) { console.error(`Figma offline: ${error.message}`); process.exitCode = 1; }
}
