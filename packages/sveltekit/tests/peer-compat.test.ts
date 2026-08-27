import { describe, expect, test } from 'bun:test';
import manifest from '../package.json';

describe('@svadmin/sveltekit peer compatibility', () => {
  test('supports the current core release without dropping existing consumers', () => {
    const corePeerRange = manifest.peerDependencies['@svadmin/core'];

    expect(corePeerRange).toBe('>=0.32.2 <0.42.0');
    expect(Bun.semver.satisfies('0.32.2', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.38.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.39.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.40.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.41.0', corePeerRange)).toBe(true);
    expect(Bun.semver.satisfies('0.42.0', corePeerRange)).toBe(false);
  });
});
