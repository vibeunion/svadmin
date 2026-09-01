import { readdir, rm } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

export function isGeneratedTestArtifact(path: string): boolean {
  const fileName = basename(path);

  return (
    /[.-](?:test|spec)(?:[.-]|$)/i.test(fileName) ||
    /(?:^|[.-])test-host(?:[.-]|$)/i.test(fileName) ||
    /TestHost(?:[.-]|$)/.test(fileName) ||
    /^setupTest(?:[.-]|$)/.test(fileName)
  );
}

export async function cleanDist(directory: string): Promise<string[]> {
  const removed: string[] = [];

  async function visit(currentDirectory: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && isGeneratedTestArtifact(entry.name)) {
        await rm(path);
        removed.push(relative(directory, path));
      }
    }
  }

  await visit(directory);
  return removed.sort();
}

if (import.meta.main) {
  const distDirectory = resolve(import.meta.dir, '..', 'dist');
  const removed = await cleanDist(distDirectory);
  console.info(`Removed ${removed.length} generated test artifact${removed.length === 1 ? '' : 's'} from dist`);
}
