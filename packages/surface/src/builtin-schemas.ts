import { z } from 'zod';

const catalogFieldSchema = z.string().min(1).max(64).regex(/^[A-Za-z][A-Za-z0-9_-]*$/u);

export const metricPropsSchema = z.object({
  label: z.string().min(1).max(80),
  format: z.enum(['number', 'currency', 'percent']),
  currency: z.string().regex(/^[A-Z]{3}$/u).optional(),
  description: z.string().min(1).max(160).optional(),
}).strict().superRefine((props, context) => {
  if (props.format === 'currency' && !props.currency) {
    context.addIssue({ code: 'custom', path: ['currency'], message: 'Currency format requires an ISO currency code' });
  }
  if (props.format !== 'currency' && props.currency) {
    context.addIssue({ code: 'custom', path: ['currency'], message: 'Currency is only valid with currency format' });
  }
});

export const resourceTablePropsSchema = z.object({
  title: z.string().min(1).max(80),
  emptyLabel: z.string().min(1).max(80).optional(),
  columns: z.array(z.object({
    field: catalogFieldSchema,
    label: z.string().min(1).max(60),
    format: z.enum(['text', 'number', 'date', 'boolean']).optional(),
  }).strict()).min(1).max(8),
}).strict();

export const barChartPropsSchema = z.object({
  title: z.string().min(1).max(80),
  labelField: catalogFieldSchema,
  valueField: catalogFieldSchema,
  showValues: z.boolean().optional(),
}).strict();

export const lineChartPropsSchema = z.object({
  title: z.string().min(1).max(80),
  labelField: catalogFieldSchema,
  valueField: catalogFieldSchema,
  showDots: z.boolean().optional(),
  fill: z.boolean().optional(),
}).strict();

export type MetricProps = z.infer<typeof metricPropsSchema>;
export type ResourceTableProps = z.infer<typeof resourceTablePropsSchema>;
export type BarChartProps = z.infer<typeof barChartPropsSchema>;
export type LineChartProps = z.infer<typeof lineChartPropsSchema>;
