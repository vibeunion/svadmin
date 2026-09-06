import type { StaticDecode, TObject } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { Component } from 'svelte';

export type GeneratedComponentProps = Record<string, unknown>;
export type GeneratedComponentSchemaProps<Schema extends TObject> =
  StaticDecode<Schema> extends infer Props extends Record<string, unknown> ? Props : never;

export interface GeneratedComponentDefinition<Schema extends TObject = TObject> {
  readonly component: Component<GeneratedComponentSchemaProps<Schema>>;
  readonly schema: Schema;
  readonly description?: string;
}

export interface RuntimeGeneratedComponentDefinition {
  readonly component: Component<never>;
  readonly schema: TObject;
  readonly description?: string;
}

export type GeneratedComponentRegistry = Record<string, RuntimeGeneratedComponentDefinition>;

export interface GeneratedComponentPromptOptions {
  /** Adds a caller-owned instruction before the generated catalog. */
  readonly preamble?: string;
  /** Includes the JSON Schema for each component's props. */
  readonly includeSchemas?: boolean;
}

/** Defines Agent-rendered components with a TypeBox schema as the runtime props boundary. */
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

/**
 * Creates a deterministic model-facing catalog from the allow-listed registry.
 * The catalog describes data and component names only; visual styling remains
 * owned by the registered Svelte components.
 */
export function createGeneratedComponentPrompt(
  registry: GeneratedComponentRegistry,
  options: GeneratedComponentPromptOptions = {},
): string {
  const entries = Object.entries(registry)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, definition]) => {
      const description = definition.description ? ` - ${definition.description}` : '';
      const schema = options.includeSchemas === false
        ? ''
        : `\n  propsSchema: ${JSON.stringify(definition.schema)}`;
      return `- ${name}${description}${schema}`;
    });

  const preamble = options.preamble?.trim();
  const header = preamble ? `${preamble}\n\n` : '';
  return `${header}You may render only registered components from this catalog. Do not emit HTML, CSS, class names, or unregistered component names. Validate every prop against the component propsSchema.\n\nComponents:\n${entries.join('\n')}`;
}

function strictGeneratedObjectSchema<Schema extends TObject>(schema: Schema): Schema {
  if (schema.additionalProperties === false) return schema;
  return { ...schema, additionalProperties: false };
}
