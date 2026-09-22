import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { featureResourceModules } from '../example/src/features/resource-registry';

const root = resolve(import.meta.dir, '../example/src/features');
const modules = readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(name => readdirSync(resolve(root, name)).includes('resources.ts'));

describe('feature data public entries', () => {
  it.each(modules)('%s exposes its own resources without a Svelte loader', async name => {
    const entry: unknown = await import(resolve(root, name, 'data.ts'));
    expect(entry).toBeObject();
    if (typeof entry !== 'object' || entry === null) throw new Error('Invalid module');
    const resources: unknown = Reflect.get(entry, `${name}Resources`);
    if (!Array.isArray(resources)) throw new Error('Missing resources');
    for (const resource of resources) {
      if (typeof resource !== 'object' || resource === null) throw new Error('Invalid resource');
      const resourceName: unknown = Reflect.get(resource, 'name');
      if (typeof resourceName !== 'string') throw new Error('Missing resource name');
      expect(resourceName === 'design_principles' ? 'showcase'
        : Reflect.get(featureResourceModules, resourceName)).toBe(name);
    }
  });

  it('assembles resource modules through data entries only', () => {
    const file = resolve(root, '../resources.ts');
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    const imports = source.statements.flatMap(statement =>
      ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
        ? [statement.moduleSpecifier.text] : []);
    expect(imports.filter(path => /^\.\/features\/[^/]+\//u.test(path)).sort())
      .toEqual(modules.map(name => `./features/${name}/data`).sort());
  });
});
