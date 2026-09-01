import { describe, expect, test } from 'bun:test';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanDist, isGeneratedTestArtifact } from './clean-dist.js';

describe('ai-elements dist cleanup', () => {
  test('recognizes generated tests without matching the test-results component family', () => {
    expect(isGeneratedTestArtifact('contracts.test.js')).toBe(true);
    expect(isGeneratedTestArtifact('ssr-smoke.test-ssr.config.d.ts')).toBe(true);
    expect(isGeneratedTestArtifact('component-spec.js')).toBe(true);
    expect(isGeneratedTestArtifact('Attachments.test-host.svelte')).toBe(true);
    expect(isGeneratedTestArtifact('WorkflowComponentsTestHost.svelte')).toBe(true);
    expect(isGeneratedTestArtifact('setupTest.js')).toBe(true);
    expect(isGeneratedTestArtifact('Test.svelte')).toBe(false);
    expect(isGeneratedTestArtifact('TestStatus.svelte.d.ts')).toBe(false);
  });

  test('removes generated fixtures and preserves production files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'svadmin-ai-elements-dist-'));
    const generatedFiles = [
      'contracts.test.js',
      'components/attachments/Attachments.test-host.svelte',
      'components/question/WorkflowComponentsTestHost.svelte.d.ts',
      'setupTest.js',
    ];
    const productionFiles = [
      'index.js',
      'components/test-results/Test.svelte',
      'components/test-results/TestStatus.svelte.d.ts',
    ];

    try {
      for (const path of [...generatedFiles, ...productionFiles]) {
        const target = join(directory, path);
        await mkdir(join(target, '..'), { recursive: true });
        await writeFile(target, path);
      }

      expect(await cleanDist(directory)).toEqual(generatedFiles.sort());

      for (const path of generatedFiles) {
        await expect(access(join(directory, path))).rejects.toThrow();
      }
      for (const path of productionFiles) {
        expect(await readFile(join(directory, path), 'utf8')).toBe(path);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
