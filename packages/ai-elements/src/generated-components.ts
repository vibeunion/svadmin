import type { StaticDecode, TObject } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { Component } from 'svelte';

export type GeneratedComponentProps = Record<string, unknown>;
export type GeneratedComponentSchemaProps<Schema extends TObject> =
  StaticDecode<Schema> extends infer Props extends Record<string, unknown> ? Props : never;

export interface GeneratedComponentDefinition<Schema extends TObject = TObject> {
  readonly component: Component<GeneratedComponentSchemaProps<Schema>>;
  readonly schema: Schema;
}

export interface RuntimeGeneratedComponentDefinition {
  readonly component: Component<never>;
  readonly schema: TObject;
}

export type GeneratedComponentRegistry = Record<string, RuntimeGeneratedComponentDefinition>;

/** 定义 Agent 可渲染组件，并以 TypeBox schema 作为运行时 props 边界。 */
export function defineGeneratedComponent<const Schema extends TObject>(
  definition: GeneratedComponentDefinition<Schema>,
): GeneratedComponentDefinition<Schema> {
  return {
    ...definition,
    schema: strictGeneratedObjectSchema(definition.schema),
  };
}

export function decodeGeneratedObjectProps(
  schema: TObject,
  input: unknown,
): GeneratedComponentProps {
  const decoded: unknown = Value.Decode(strictGeneratedObjectSchema(schema), input);
  if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new TypeError('Generated component props must decode to an object.');
  }
  return decoded as GeneratedComponentProps;
}

export function decodeGeneratedComponentProps(
  definition: RuntimeGeneratedComponentDefinition,
  input: unknown,
): GeneratedComponentProps {
  return decodeGeneratedObjectProps(definition.schema, input);
}

function strictGeneratedObjectSchema<Schema extends TObject>(schema: Schema): Schema {
  if (schema.additionalProperties === false) return schema;
  return { ...schema, additionalProperties: false };
}
