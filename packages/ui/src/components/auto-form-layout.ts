/**
 * Layout helpers for `AutoForm`.
 *
 * Kept out of the component so the form stays under the module-size budget and
 * the grid/span mapping can be tested without rendering.
 */
import type { FieldDefinition } from '@svadmin/core';
import type { SchemaFormLayoutPlan } from '@svadmin/core/schema-form';

export function gridClassFor(count: number): string {
  if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
  if (count === 3) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4';
  return 'space-y-5';
}

export function spanClass(span: number | undefined): string {
  if (span === 2) return 'md:col-span-2';
  if (span === 3) return 'md:col-span-2 lg:col-span-3';
  if (span !== undefined && span >= 4) return 'md:col-span-2 lg:col-span-4';
  return '';
}

export interface FormLayoutGroup {
  name: string;
  description: string | undefined;
  columns: number;
  fields: FieldDefinition[];
}

/** Map declarative layout spans into a lookup the field renderer can use. */
export function buildSpanByKey(layout: SchemaFormLayoutPlan | undefined): Map<string, number> {
  const spans = new Map<string, number>();
  for (const group of layout?.groups ?? []) {
    for (const field of group.fields) spans.set(field.key, field.span);
  }
  return spans;
}

/**
 * Resolve render groups: declarative sections/steps win, then `field.group`,
 * then a single ungrouped list.
 */
export function buildFormGroups(input: {
  layout: SchemaFormLayoutPlan | undefined;
  fields: readonly FieldDefinition[];
  columns: number;
}): FormLayoutGroup[] {
  const { layout, fields, columns } = input;
  if (layout && (layout.kind === 'sections' || layout.kind === 'steps')) {
    return layout.groups.map((group) => ({
      name: group.step !== undefined ? `${group.step}. ${group.title ?? ''}`.trim() : (group.title ?? ''),
      description: group.description,
      columns: group.columns,
      fields: group.fields.flatMap((item) => {
        const field = fields.find((candidate) => candidate.key === item.key);
        return field ? [field] : [];
      }),
    }));
  }
  if (!fields.some((field) => field.group)) return [];
  const order: string[] = [];
  const map = new Map<string, FieldDefinition[]>();
  for (const field of fields) {
    const name = field.group ?? '';
    if (!map.has(name)) {
      order.push(name);
      map.set(name, []);
    }
    (map.get(name) ?? []).push(field);
  }
  return order.map((name) => ({
    name,
    description: undefined,
    columns,
    fields: map.get(name) ?? [],
  }));
}

export function isFullWidthField(field: Pick<FieldDefinition, 'type'>): boolean {
  return (
    field.type === 'textarea' ||
    field.type === 'richtext' ||
    field.type === 'json' ||
    field.type === 'array' ||
    field.type === 'images'
  );
}