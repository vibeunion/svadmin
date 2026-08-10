import { describe, expect, test } from 'bun:test';
import { npmPackageVersionStatus } from './npm-package-version';

const packageVersion = {
  name: '@svadmin/refine-adapter',
  version: '0.10.0',
};

describe('npm package version status', () => {
  test('accepts only the exact published version', () => {
    expect(
      npmPackageVersionStatus({
        ...packageVersion,
        runNpmView: () => ({ status: 0, stdout: '0.10.0\n', stderr: '' }),
      }),
    ).toBe('published');

    expect(() =>
      npmPackageVersionStatus({
        ...packageVersion,
        runNpmView: () => ({ status: 0, stdout: '0.9.4\n', stderr: '' }),
      }),
    ).toThrow('npm returned 0.9.4 for @svadmin/refine-adapter, expected 0.10.0');
  });

  test('treats only an explicit E404 as missing', () => {
    expect(
      npmPackageVersionStatus({
        ...packageVersion,
        runNpmView: () => ({ status: 1, stdout: '', stderr: 'npm error code E404' }),
      }),
    ).toBe('missing');

    expect(() =>
      npmPackageVersionStatus({
        ...packageVersion,
        runNpmView: () => ({ status: 1, stdout: '', stderr: 'npm error code ECONNRESET' }),
      }),
    ).toThrow('npm registry lookup failed for @svadmin/refine-adapter@0.10.0 (exit 1)');
  });

  test('fails closed when the registry command times out', () => {
    expect(() =>
      npmPackageVersionStatus({
        ...packageVersion,
        runNpmView: () => ({
          status: null,
          stdout: '',
          stderr: '',
          error: new Error('ETIMEDOUT'),
        }),
      }),
    ).toThrow('npm registry lookup could not start for @svadmin/refine-adapter@0.10.0');
  });
});
