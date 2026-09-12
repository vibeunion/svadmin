import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { demoSchemas, type DemoDatabase } from './resource-schemas';

const databaseSchema = Type.Object(Object.fromEntries(
  Object.entries(demoSchemas).map(([name, schema]) => [name, Type.Array(schema)]),
), { additionalProperties: false });

// Every required resource and row is checked against the same map that defines DemoDatabase.
function isDemoDatabase(value: unknown): value is DemoDatabase {
  return Value.Check(databaseSchema, value);
}

export function parseDemoDatabase(value: unknown): DemoDatabase {
  if (!isDemoDatabase(value)) throw new Error('Invalid stored demo database');
  return value;
}
