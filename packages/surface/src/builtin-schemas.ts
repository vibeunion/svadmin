import { Type, type Static } from "@sinclair/typebox";

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

export const metricPropsSchema = Type.Union([currencyMetric, otherMetric]);

export const resourceTablePropsSchema = Type.Object({
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
  }, { additionalProperties: false });

export const barChartPropsSchema = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 80 }),
    labelField: catalogFieldSchema,
    valueField: catalogFieldSchema,
    showValues: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false });

export const lineChartPropsSchema = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 80 }),
    labelField: catalogFieldSchema,
    valueField: catalogFieldSchema,
    showDots: Type.Optional(Type.Boolean()),
    fill: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false });

export type MetricProps = Static<typeof metricPropsSchema>;
export type ResourceTableProps = Static<typeof resourceTablePropsSchema>;
export type BarChartProps = Static<typeof barChartPropsSchema>;
export type LineChartProps = Static<typeof lineChartPropsSchema>;
