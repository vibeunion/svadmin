import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

for (const name of ['ui', 'surface']) {
  const path = resolve(`packages/${name}/dist/styled-system`);
  assert.ok(!existsSync(join(path, 'types/global.d.ts')), `${name}: build-time global types were published`);
  for (const file of readdirSync(path, { recursive: true })) {
    if (!/\.(?:js|ts)$/.test(file)) continue;
    assert.ok(!/@pandacss\//.test(readFileSync(join(path, file), 'utf8')), `${name}/${file}: Panda dependency leak`);
  }
}
assert.equal(readFileSync('packages/ui/src/styles/recipes.css', 'utf8'), readFileSync('packages/surface/dist/styles.css', 'utf8'));
const temporary = mkdtempSync(join(tmpdir(), 'svadmin-panda-runtime-'));
try {
  cpSync('packages/surface/dist/styled-system', join(temporary, 'styled-system'), { recursive: true });
  writeFileSync(join(temporary, 'package.json'), '{"private":true,"type":"module"}');
  writeFileSync(join(temporary, 'index.ts'), `import { surfaceMetric, surfaceTable } from './styled-system/recipes/index.js';
surfaceMetric({ tone: 'warning', density: 'compact' });
surfaceTable({ density: 'comfortable' });
// @ts-expect-error Only public semantic values are accepted.
surfaceMetric({ tone: '#ff0000' });
// @ts-expect-error Arbitrary CSS is not a recipe prop.
surfaceTable({ style: { display: 'none' } });
`);
  writeFileSync(join(temporary, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    strict: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: false,
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', types: [],
  }, include: ['index.ts', 'styled-system/**/*.d.ts'] }));
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', join(temporary, 'tsconfig.json')], { stdio: 'inherit' });
  execFileSync(process.execPath, ['--input-type=module', '-e', "import('./styled-system/recipes/index.js').then(({surfaceMetric}) => { if (!surfaceMetric({tone:'warning'}).card) process.exit(1); })"], { cwd: temporary, stdio: 'inherit' });
  assert.ok(!existsSync(join(temporary, 'node_modules')));
  console.info('Standalone Panda helper runtime and strict declarations pass without any installed dependencies.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
