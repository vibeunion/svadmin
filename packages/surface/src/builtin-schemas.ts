import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export function createParsedSchema<T extends TSchema>(schema: T): T & {
  parse: (value: unknown) => Static<T>;
  safeParse: (value: unknown) => { success: true; data: Static<T> } | { success: false; error: { issues: Array<{ path: string[]; message: string }> } };
  Check: (value: unknown) => boolean;
} {
  const compiled = TypeCompiler.Compile(schema);
  const parse = (value: unknown): Static<T> => {
    if (compiled.Check(value)) return value as Static<T>;
    const errors = [...compiled.Errors(value)];
    const message = errors.map((e) => (e.path ? e.path + ": " : "") + e.message).join(", ") || "Validation error";
    const err = new Error(message) as Error & { issues: Array<{ path: string[]; message: string }> };
    err.issues = errors.map((e) => ({
      path: e.path ? (e.path.startsWith("/") ? e.path.slice(1) : e.path).split("/") : [],
      message: e.message,
    }));
    throw err;
  };
  const safeParse = (value: unknown) => {
    if (compiled.Check(value)) {
      return { success: true as const, data: value as Static<T> };
    }
    const errors = [...compiled.Errors(value)];
    return {
      success: false as const,
      error: {
        issues: errors.map((e) => ({
          path: e.path ? (e.path.startsWith("/") ? e.path.slice(1) : e.path).split("/") : [],
          message: e.message,
        })),
      },
    };
  };

  return Object.assign(schema, {
    parse,
    safeParse,
    Check: (val: unknown) => compiled.Check(val),
  });
}

const catalogFieldSchema = Type.String({
  minLength: 1,
  maxLength: 64,
  pattern: "^[A-Za-z][A-Za-z0-9_-]*$",
});

const currencyMetric = Type.Object({
  label: Type.String({ minLength: 1, maxLength: 80 }),
  format: Type.Literal("currency"),
  currency: Type.String({ pattern: "^[A-Z]{3}$" }),
  description: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
}, { additionalProperties: false });

const otherMetric = Type.Object({
  label: Type.String({ minLength: 1, maxLength: 80 }),
  format: Type.Union([Type.Literal("number"), Type.Literal("percent")]),
  currency: Type.Optional(Type.Never()),
  description: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
}, { additionalProperties: false });

export const metricPropsSchema = createParsedSchema(
  Type.Union([currencyMetric, otherMetric])
);

export const resourceTablePropsSchema = createParsedSchema(
  Type.Object({
    title: Type.String({ minLength: 1, maxLength: 80 }),
    emptyLabel: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
    columns: Type.Array(
      Type.Object({
        field: catalogFieldSchema,
        label: Type.String({ minLength: 1, maxLength: 60 }),
        format: Type.Optional(Type.Union([
          Type.Literal("text"),
          Type.Literal("number"),
          Type.Literal("date"),
          Type.Literal("boolean"),
        ])),
      }, { additionalProperties: false }),
      { minItems: 1, maxItems: 8 },
    ),
  }, { additionalProperties: false })
);

export const barChartPropsSchema = createParsedSchema(
  Type.Object({
    title: Type.String({ minLength: 1, maxLength: 80 }),
    labelField: catalogFieldSchema,
    valueField: catalogFieldSchema,
    showValues: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false })
);

export const lineChartPropsSchema = createParsedSchema(
  Type.Object({
    title: Type.String({ minLength: 1, maxLength: 80 }),
    labelField: catalogFieldSchema,
    valueField: catalogFieldSchema,
    showDots: Type.Optional(Type.Boolean()),
    fill: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false })
);

export type MetricProps = Static<typeof metricPropsSchema>;
export type ResourceTableProps = Static<typeof resourceTablePropsSchema>;
export type BarChartProps = Static<typeof barChartPropsSchema>;
export type LineChartProps = Static<typeof lineChartPropsSchema>;
