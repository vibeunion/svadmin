import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export interface SchemaFormIssue {
  /** JSON Pointer from the schema validator; never includes submitted values. */
  path: string;
  type: number;
}

export interface SchemaFormOptions {
  references?: TSchema[];
  message?: (issue: SchemaFormIssue) => string;
  field?: (pointer: string) => string;
  formField?: string;
}

/** Adapter for useForm.validate. It validates without coercing or clearing input. */
export function createSchemaFormValidator(schema: TSchema, options: SchemaFormOptions = {}) {
  return (values: unknown): Record<string, string> | null => {
    const errors: Record<string, string> = Object.create(null);
    for (const error of Value.Errors(schema, options.references ?? [], values)) {
      const field = options.field?.(error.path) ?? (error.path
        ? error.path.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~')).join('.')
        : options.formField ?? '_form');
      if (!Object.hasOwn(errors, field)) {
        errors[field] = options.message?.({ path: error.path, type: error.type }) ?? 'Invalid value';
      }
    }
    return Object.keys(errors).length ? errors : null;
  };
}
