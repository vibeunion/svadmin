import { Type } from '@sinclair/typebox';
import { defineResource, useSelect, type UseSelectOptions } from '@svadmin/core';
import { mapSelectOptions, mergeSelectOptions } from '../../../core/src/select-options';

const schemas = { record: Type.Object({
  id: Type.Number(), title: Type.String(), active: Type.Boolean(),
}) };
const posts = defineResource('posts', schemas);
const options: UseSelectOptions<typeof schemas> = {
  resource: posts, optionLabel: 'title', optionValue: 'id', defaultValue: [1],
  onSearch: value => [{ field: 'title', operator: 'contains', value }],
};
const select = useSelect(options);
if (select.query.isSuccess) {
  const first = select.query.data.data[0];
  if (first) {
    const title: string = first.title;
    void title;
    // @ts-expect-error Record fields retain the concrete schema's types.
    const invalid: number = first.title;
    void invalid;
  }
  const total: number = select.query.data.total;
  void total;
}
if (select.defaultValueQuery.isSuccess) {
  const first = select.defaultValueQuery.data.data[0];
  if (first) {
    const id: number = first.id;
    void id;
  }
}
if (select.query.isError) {
  // @ts-expect-error A transport can throw non-Error values.
  const error: Error = select.query.error;
  void error;
}
if (select.defaultValueQuery.isError) {
  // @ts-expect-error Default-record transport errors are also unknown.
  const error: Error = select.defaultValueQuery.error;
  void error;
}
const option: { label: string; value: string | number } | undefined = select.options[0];
const retry: Promise<void> = select.refetch();
void option;
void retry;
useSelect({ resource: posts, optionLabel: row => row.title, optionValue: row => row.id });
// @ts-expect-error A raw string is not a runtime resource contract.
useSelect({ resource: 'posts', optionLabel: 'title', optionValue: 'id' });
// @ts-expect-error An absent label field is forbidden.
useSelect({ resource: posts, optionLabel: 'absent', optionValue: 'id' });
// @ts-expect-error Boolean fields cannot identify options.
useSelect({ resource: posts, optionLabel: 'title', optionValue: 'active' });
// @ts-expect-error Default IDs must use the resource ID type.
useSelect({ resource: posts, optionLabel: 'title', optionValue: 'id', defaultValue: ['1'] });
// @ts-expect-error Label callbacks must return strings.
useSelect({ resource: posts, optionLabel: row => row.id, optionValue: 'id' });
// @ts-expect-error Search operands follow the field schema.
useSelect({ resource: posts, optionLabel: 'title', optionValue: 'id', onSearch: () => [{ field: 'id', operator: 'eq', value: '1' }] });
// @ts-expect-error Value callbacks cannot return an arbitrary object.
useSelect({ resource: posts, optionLabel: 'title', optionValue: row => ({ id: row.id }) });
// @ts-expect-error Options do not expose fabricated properties.
void select.options[0]?.missing;
// @ts-expect-error Unchecked external values cannot become select options.
mergeSelectOptions([{ label: 'bad', value: false }]);
void mapSelectOptions;

async function checkRefetchProjection() {
  const list = await select.query.refetch();
  if (list.isSuccess) {
    const total: number = list.data.total;
    const label: string | undefined = list.data.options[0]?.label;
    void total;
    void label;
  }
  if (list.isPending) {
    const empty: undefined = list.data;
    void empty;
  }
  // @ts-expect-error Refetch success must be narrowed before reading selected records.
  void list.data.data;
  const defaults = await select.defaultValueQuery.refetch();
  if (defaults.isSuccess) {
    const id: number | undefined = defaults.data.data[0]?.id;
    const label: string | undefined = defaults.data.options[0]?.label;
    void id;
    void label;
    // @ts-expect-error Default backfill has no fabricated total count.
    void defaults.data.total;
  }
}
void checkRefetchProjection;
