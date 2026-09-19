import { Value } from '@sinclair/typebox/value';
import type { TSchema } from '@sinclair/typebox';
import { surfaceSchemaToJson } from '../agent-contract.js';
import type { SurfaceActionDescriptor, SurfaceRegisteredAction } from './types.js';

/** Only the form subset actually rendered by JsonSchemaForm is advertised.
 * No refs, transforms, secret inputs, arbitrary unions or computed fields.
 */
export function validateSurfaceActionDescriptor(action: SurfaceActionDescriptor): void {
  if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(action.id) || !action.version || action.version.length > 64
    || !action.label.trim() || action.label.length > 120 || !['confirm', 'four-eyes'].includes(action.approval)) {
    throw new Error('Invalid Surface action contract');
  }
  surfaceSchemaToJson(action.inputSchema);
  let fields = 0;
  function visit(schema: TSchema, depth: number): void {
    if (++fields > 128 || depth > 8) throw new Error('Surface form schema exceeds supported limits');
    if (schema.anyOf || schema.oneOf || schema.allOf || schema.not || schema.if || schema.writeOnly
      || !['object', 'array', 'string', 'number', 'integer', 'boolean'].includes(schema.type)) {
      throw new Error('Unsupported Surface form schema; use a registered custom widget instead');
    }
    if (schema.type === 'object') {
      if (schema.additionalProperties !== false || !schema.properties) throw new Error('Surface actions require closed object schemas');
      for (const [name, child] of Object.entries(schema.properties)) {
        if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(name)) throw new Error('Invalid Surface form field');
        visit(child as TSchema, depth + 1);
      }
    } else if (schema.type === 'array') {
      if (!schema.items || Array.isArray(schema.items)) throw new Error('Surface forms require homogeneous array items');
      visit(schema.items, depth + 1);
    }
  }
  if (action.inputSchema.type !== 'object') throw new Error('Surface actions require an object input schema');
  visit(action.inputSchema, 0);
}

function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(snapshot)) as T;
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Reflect.ownKeys(value).map((key) => [key, snapshot(Reflect.get(value, key))]))) as T;
  }
  return value;
}

/** One immutable schema drives the form and the server validation. */
export function defineSurfaceAction(action: Omit<SurfaceRegisteredAction, 'validateInput'>): SurfaceRegisteredAction {
  validateSurfaceActionDescriptor(action);
  if (typeof action.authorize !== 'function' || typeof action.execute !== 'function') throw new Error('Surface actions require authorization and execution handlers');
  const inputSchema = snapshot(action.inputSchema);
  return Object.freeze({ ...action, inputSchema, validateInput: (input: unknown) => Value.Check(inputSchema, input) });
}
