import type { ComponentProps } from 'svelte';
import AutoComplete from './AutoComplete.svelte';

type Props = ComponentProps<typeof AutoComplete>;

const onChange = (value: string | number | null): void => { void value; };
const valid: Props = {
  resource: 'posts',
  value: 1,
  onchange: onChange,
  optionLabel: 'title',
  optionValue: 'id',
  placeholder: 'Pick a record',
  onSearch: value => [{ field: 'title', operator: 'contains', value }],
  fetchSize: 50,
  requestTimeout: 1000,
  debounce: 0,
  virtualized: true,
  itemHeight: 36,
  viewportHeight: 280,
  disabled: false,
  id: 'autocomplete',
  class: 'wide',
  'aria-label': 'Record',
  'aria-describedby': 'help',
  'aria-invalid': false,
};
void valid;

// AutoComplete is a single-value control; it does not accept Combobox array values.
// @ts-expect-error Arrays are not part of the AutoComplete value boundary.
const multi: Props = { resource: 'posts', value: [1, 2] };
// The public clear callback is exactly null for this single-value control.
// @ts-expect-error Array callbacks do not match the null clear contract.
const arrayChange: Props = { resource: 'posts', onchange: (value: string[]) => { void value; } };
// @ts-expect-error requestTimeout must be numeric when provided.
const badTimeout: Props = { resource: 'posts', requestTimeout: '1000' };
// @ts-expect-error debounce must be numeric when provided.
const badDebounce: Props = { resource: 'posts', debounce: false };
// @ts-expect-error onSearch must be a filter callback, not a field name.
const badSearch: Props = { resource: 'posts', onSearch: 'title' };
void multi;
void arrayChange;
void badTimeout;
void badDebounce;
void badSearch;