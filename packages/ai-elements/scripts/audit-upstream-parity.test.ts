import { describe, expect, test } from 'bun:test';
import { collectImportSpecifiers, collectRuntimeExports } from './audit-upstream-parity';

describe('AI Elements upstream AST audit', () => {
  test('collects runtime exports without counting type-only declarations', () => {
    const source = `
      export type HiddenProps = { value: string };
      export interface HiddenInterface { value: string }
      export const Visible = () => null;
      export function helper() {}
      const Local = 1;
      export { Local as Renamed };
      export { type HiddenProps as HiddenAlias, Visible as Reexported };
    `;
    expect(collectRuntimeExports('fixture.tsx', source)).toEqual(['Reexported', 'Renamed', 'Visible', 'helper']);
  });

  test('finds ESM and CommonJS Zod imports from syntax nodes', () => {
    expect(collectImportSpecifiers('fixture.ts', `import { z } from 'zod';`)).toContain('zod');
    expect(collectImportSpecifiers('fixture.ts', `const z = require('zod');`)).toContain('zod');
    expect(collectImportSpecifiers('fixture.ts', `const text = "from 'zod'";`)).not.toContain('zod');
    expect(collectImportSpecifiers('fixture.ts', `import('zod/v4'); export * from 'zod/mini';`)).toEqual(['zod/mini', 'zod/v4']);
  });
});
