import { describe, expect, test } from 'bun:test';
import manifest from '../package.json';

describe('@svadmin/sveltekit peer compatibility', () => {
  test('supports the current core release without dropping existing consumers', () => {
    expect(manifest.peerDependencies['@svadmin/core']).toBe('>=0.32.2 <0.38.0');
  });
});
