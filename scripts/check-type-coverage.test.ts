import { describe, expect, test } from 'bun:test';
import { assertCoverage, assertRuntimeImports, assertStrictOptions, checkWorkspaceCoverage } from './check-type-coverage';

describe('strict checking coverage', () => {
  test('rejects missing strict flags, skipped declarations and explicit strict subflag overrides', () => {
    const strict = {
      strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
      noImplicitOverride: true, noPropertyAccessFromIndexSignature: true,
      noFallthroughCasesInSwitch: true, skipLibCheck: false,
    };
    expect(() => assertStrictOptions('valid', strict)).not.toThrow();
    expect(() => assertStrictOptions('incomplete', {})).toThrow('noUncheckedIndexedAccess');
    expect(() => assertStrictOptions('skipped', { ...strict, skipLibCheck: true })).toThrow('skipLibCheck');
    expect(() => assertStrictOptions('overridden', { ...strict, strictNullChecks: false })).toThrow('strictNullChecks');
    expect(() => assertStrictOptions('overridden', { ...strict, noImplicitAny: false })).toThrow('noImplicitAny');
  });
  test('rejects omitted maintained sources', () => {
    expect(() => assertCoverage(['src.ts', 'source.test.ts'], ['src.ts'], []))
      .toThrow('source.test.ts');
    expect(() => assertCoverage(['src.ts', 'source.test.ts'], ['src.ts'], ['source.test.ts']))
      .not.toThrow();
  });

  test('does not mistake import-looking comments or strings for runtime imports', () => {
    assertRuntimeImports('source.ts', '// import x from "bun:test";', 'browser');
    assertRuntimeImports('source.ts', 'const text = "from bun:test";', 'browser');
  });

  test('rejects imports and reference directives from the other runtime', () => {
    expect(() => assertRuntimeImports('source.ts', 'import { test } from "bun:test";', 'browser')).toThrow('bun:test');
    expect(() => assertRuntimeImports('source.ts', '/// <reference types="bun" />', 'browser')).toThrow('bun');
    expect(() => assertRuntimeImports('test.ts', 'import { test } from "vitest";', 'bun')).toThrow('vitest');
    expect(() => assertRuntimeImports('test.ts', '/// <reference types="vite/client" />', 'bun')).toThrow('vite/client');
  });

  test('covers every root TypeScript and Svelte source in the checkout', () => {
    checkWorkspaceCoverage();
  });
});
