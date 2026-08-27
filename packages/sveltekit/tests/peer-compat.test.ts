import { describe, expect, test } from 'bun:test';
import coreManifest from '../../core/package.json';
import manifest from '../package.json';

describe('@svadmin/sveltekit peer compatibility', () => {
  test('supports the current core release without dropping existing consumers', () => {
    const corePeerRange = manifest.peerDependencies['@svadmin/core'];
    const [coreMajor, coreMinor] = coreManifest.version.split('.').map(Number);
    const nextCoreMinor = `${coreMajor}.${coreMinor + 1}.0`;

    expect(corePeerRange).toBe(`>=0.32.2 <${nextCoreMinor}`);
    expect(Bun.semver.satisfies('0.32.2', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.38.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.39.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.40.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.41.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies(coreManifest.version, corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies(nextCoreMinor, corePeerRange)).toBe(false);
  });
});
