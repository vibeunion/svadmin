import type { Static, StaticDecode, TSchema } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

interface StandardIssue {
  readonly message: string;
  readonly path: readonly string[];
}

type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: readonly StandardIssue[] };

/** Test-only Standard Schema boundary; not part of @svadmin/elysia's exports. */
interface StandardSchemaFixture<Input, Output> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly types?: { readonly input: Input; readonly output: Output };
    readonly validate: (value: unknown) => StandardResult<Output> | Promise<StandardResult<Output>>;
  };
}

/**
 * Keep exercising Elysia's Standard Schema branch without a second schema
 * library. TypeBox supplies both the actual validation and the decoded type.
 * This fixture deliberately does not coerce, default, or strip input values.
 */
export function typeboxStandard<Schema extends TSchema>(
  schema: Schema,
): StandardSchemaFixture<Static<Schema>, StaticDecode<Schema>> {
  const validator = TypeCompiler.Compile(schema);
  return {
    '~standard': {
      version: 1,
      vendor: 'svadmin-typebox-test',
      validate(value) {
        if (!validator.Check(value)) {
          return {
            issues: [...validator.Errors(value)].map(({ message, path }) => ({
              message,
              // TypeBox uses JSON Pointers; Standard Schema uses path segments.
              // Unescape first so Elysia does not escape the pointer twice.
              path: path === '' ? [] : path.slice(1).split('/').map(segment =>
                segment.replace(/~1/g, '/').replace(/~0/g, '~')),
            })),
          };
        }
        return { value: validator.Decode(value) };
      },
    },
  };
}

/** Async protocol fixture, not a claim that TypeBox has async refinements. */
export function typeboxAsyncStandard<Schema extends TSchema>(
  schema: Schema,
): StandardSchemaFixture<Static<Schema>, StaticDecode<Schema>> {
  const standard = typeboxStandard(schema)['~standard'];
  return {
    '~standard': {
      ...standard,
      async validate(value) {
        await Promise.resolve();
        return standard.validate(value);
      },
    },
  };
}
