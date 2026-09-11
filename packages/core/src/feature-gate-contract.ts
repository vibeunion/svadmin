import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { HttpError } from './types';
import type { FeatureGateConfig, FeatureGateUser } from './permissions.svelte';

const name = Type.String({ minLength: 1, pattern: '\\S' });
const constraints = {
  roles: Type.Optional(Type.Array(name)),
  permissions: Type.Optional(Type.Array(name)),
};
const configuration = Type.Union([
  Type.Object(constraints, { additionalProperties: false }),
  Type.Object({
    ...constraints,
    minRole: name,
    roleHierarchy: Type.Array(name, { minItems: 1, uniqueItems: true }),
  }, { additionalProperties: false }),
]);
const user = Type.Object({
  role: name,
  permissions: Type.Array(name),
}, { additionalProperties: false });

export function snapshotFeatureGateConfig(value: unknown): FeatureGateConfig {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(configuration, candidate) &&
        (!('minRole' in candidate) || candidate.roleHierarchy.includes(candidate.minRole))) {
      if (candidate.roles) Object.freeze(candidate.roles);
      if (candidate.permissions) Object.freeze(candidate.permissions);
      if ('roleHierarchy' in candidate) Object.freeze(candidate.roleHierarchy);
      return Object.freeze(candidate);
    }
  } catch {
    // Configuration errors never retain caller data or reflection diagnostics.
  }
  throw new HttpError('Invalid feature gate configuration', 422, undefined, { code: 'INVALID_FEATURE_GATE_CONFIG' });
}

/** Invalid presentation hints deny visibility instead of throwing during rendering. */
export function parseFeatureGateUser(value: unknown): FeatureGateUser | undefined {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(user, candidate)) {
      Object.freeze(candidate.permissions);
      return Object.freeze(candidate);
    }
  } catch {
    // Never invoke user getters or custom permission-collection methods.
  }
  return undefined;
}
