import { expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  liteInitCommand,
  parseLiteInitArguments,
  planLiteInit,
  writeLiteInit,
} from './lite-init';

test('lite init plans one dynamic route tree without touching the SPA', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-lite-init-'));
  try {
    await writeFile(join(projectDirectory, 'package.json'), '{"private":true}\n');
    await writeFile(join(projectDirectory, 'src-placeholder'), 'spa stays here\n');
    await Bun.write(join(projectDirectory, 'src/lib/admin.ts'), 'export const resources = []; export const dataProvider = {};\n');
    await Bun.write(join(projectDirectory, 'src/routes/.keep'), '');

    const parsed = parseLiteInitArguments([projectDirectory]);
    expect(parsed.projectDirectory).toBe(projectDirectory);
    expect(parsed.write).toBe(false);

    const plan = planLiteInit(projectDirectory);
    expect(plan.entries).toHaveLength(13);
    expect(plan.entries.every((entry) => !entry.exists)).toBe(true);
    expect(plan.entries.map((entry) => entry.relativePath)).toContain(
      'src/routes/lite/[resource]/+page.server.ts',
    );
    expect(plan.entries.map((entry) => entry.relativePath)).toContain('src/lib/svadmin-lite.ts');
    expect(plan.entries.find((entry) => entry.relativePath === 'src/lib/svadmin-lite.ts')?.content)
      .toContain("from '$lib/admin'");
    expect(plan.entries.find((entry) => entry.relativePath === 'src/routes/lite/[resource]/+page.server.ts')?.content)
      .toContain('getResource(event.params.resource)');
    expect(plan.entries.every((entry) => !entry.content.includes('process.cwd()'))).toBe(true);
    expect(plan.entries.every((entry) => !entry.content.includes('/Users/'))).toBe(true);

    const dryRunOutput = [] as string[];
    const originalLog = console.log;
    console.log = (...values: unknown[]) => dryRunOutput.push(values.join(' '));
    try {
      liteInitCommand([projectDirectory]);
    } finally {
      console.log = originalLog;
    }
    expect(dryRunOutput.join('\n')).toContain('Dry run only');
    expect(await readdir(join(projectDirectory, 'src'))).toEqual(['routes']);

    const result = writeLiteInit(plan);
    expect(result.written).toHaveLength(13);
    expect(result.preserved).toHaveLength(0);
    expect(await readFile(join(projectDirectory, 'src/routes/lite/+layout.ts'), 'utf8'))
      .toContain('csr = false');

    const originalLayout = await readFile(join(projectDirectory, 'src/routes/lite/+layout.ts'), 'utf8');
    const repeat = writeLiteInit(planLiteInit(projectDirectory));
    expect(repeat.written).toHaveLength(0);
    expect(repeat.preserved).toHaveLength(13);
    expect(await readFile(join(projectDirectory, 'src/routes/lite/+layout.ts'), 'utf8'))
      .toBe(originalLayout);
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('lite init rejects non-SvelteKit projects and unknown options', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-lite-invalid-'));
  try {
    await writeFile(join(projectDirectory, 'package.json'), '{"private":true}\n');
    expect(() => planLiteInit(projectDirectory)).toThrow('src/routes');
    expect(() => parseLiteInitArguments(['--nope'])).toThrow('Unknown option');
    expect(() => parseLiteInitArguments(['one', 'two'])).toThrow('at most one');
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});
