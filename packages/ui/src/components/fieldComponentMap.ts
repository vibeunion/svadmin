import type { Component } from 'svelte';
import type { FieldDefinition } from '@svadmin/core';
import { Type, type Static, type TObject, type TSchema } from '@sinclair/typebox';
import { closeContractSchema, createExactSchemaValidator, type SafeSchema } from '@svadmin/core/schema';
import { definedOptions } from '@svadmin/core/options';
import ValidatedField from './ValidatedField.svelte';

export interface FieldDisplayProps {
  value: unknown;
  options?: { label: string; value: string | number }[] | undefined;
  resourceName?: string | undefined;
}

export type FieldComponentMap = Readonly<Record<string, Component<FieldDisplayProps>>>;

import TextField from './fields/TextField.svelte';
import BooleanField from './fields/BooleanField.svelte';
import ImageField from './fields/ImageField.svelte';
import ImagesField from './fields/ImagesField.svelte';
import TagField from './fields/TagField.svelte';
import DateField from './fields/DateField.svelte';
import DateRangeField from './fields/DateRangeField.svelte';
import EmailField from './fields/EmailField.svelte';
import UrlField from './fields/UrlField.svelte';
import SelectField from './fields/SelectField.svelte';
import MultiSelectField from './fields/MultiSelectField.svelte';
import RelationField from './fields/RelationField.svelte';
import JsonField from './fields/JsonField.svelte';
import RichTextField from './fields/RichTextField.svelte';
import NumberField from './fields/NumberField.svelte';
import CurrencyField from './fields/CurrencyField.svelte';
import PhoneField from './fields/PhoneField.svelte';
import PercentField from './fields/PercentField.svelte';
import RatingField from './fields/RatingField.svelte';
import CodeField from './fields/CodeField.svelte';
import AvatarField from './fields/AvatarField.svelte';
import CopyField from './fields/CopyField.svelte';
import FileField from './fields/FileField.svelte';
import MarkdownField from './fields/MarkdownField.svelte';
import { jsonValueSchema } from './fields/json-value';
import PasswordField from './fields/PasswordField.svelte';
import ChoiceField from './fields/ChoiceField.svelte';

function validatedDisplay<S extends TObject>(
  schema: S,
  component: Component<NoInfer<Static<S>>>,
  project: (input: FieldDisplayProps) => unknown = input => ({ value: input.value }),
): Component<FieldDisplayProps> {
  const validator = createExactSchemaValidator(schema);
  const resolve = (input: FieldDisplayProps): { ok: true; props: Static<S> } | { ok: false } => {
    const props = project(input);
    return validator.Check(props) ? { ok: true, props } : { ok: false };
  };
  // The host owns the reactive validation; evaluating here would only check mount.
  return (internals, input) => ValidatedField(internals, { component, resolve, input });
}

const nullable = <S extends TSchema>(schema: S) => Type.Union([schema, Type.Null(), Type.Undefined()]);
const text = nullable(Type.String());
const numeric = nullable(Type.Number());
const scalar = nullable(Type.Union([Type.String(), Type.Number()]));
const date = nullable(Type.Union([Type.String(), Type.Number(), Type.Date()]));
const dateProperty = Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Date(), Type.Null()]));
const choices = Type.Optional(Type.Array(Type.Object({
  label: Type.String(), value: Type.Union([Type.String(), Type.Number()]),
}, { additionalProperties: false })));
const props = <S extends TSchema>(value: S) => Type.Object({ value }, { additionalProperties: false });
const choiceProps = (input: FieldDisplayProps) => definedOptions({
  value: input.value,
  options: input.options?.map(({ label, value }) => ({ label, value })),
});
const textDisplay = validatedDisplay(props(text), TextField);
const multiChoiceDisplay = validatedDisplay(Type.Object({
  value: nullable(Type.Array(Type.Union([Type.String(), Type.Number()]))), options: choices,
}), MultiSelectField, choiceProps);
const treeChoiceDisplay = validatedDisplay(Type.Object({
  value: nullable(Type.Union([Type.String(), Type.Number(), Type.Array(Type.Union([Type.String(), Type.Number()]))])),
  options: choices,
}), ChoiceField, choiceProps);
const ratingDisplay = validatedDisplay(props(numeric), RatingField);

/** Every dynamic renderer validates its complete projected props before mounting. */
export const builtinDisplayComponents: FieldComponentMap
  & Readonly<Record<FieldDefinition['type'], Component<FieldDisplayProps>>> = Object.freeze({
  text: textDisplay,
  string: textDisplay,
  boolean: validatedDisplay(props(nullable(Type.Boolean())), BooleanField),
  image: validatedDisplay(props(text), ImageField),
  images: validatedDisplay(props(nullable(Type.Array(Type.String()))), ImagesField),
  tags: validatedDisplay(props(nullable(Type.Union([Type.String(), Type.Array(Type.String())]))), TagField),
  date: validatedDisplay(props(date), DateField),
  daterange: validatedDisplay(props(nullable(Type.Union([
    Type.Tuple([date, date]),
    Type.Object({ start: dateProperty, end: dateProperty, from: dateProperty, to: dateProperty }, { additionalProperties: false }),
  ]))), DateRangeField),
  email: validatedDisplay(props(text), EmailField),
  url: validatedDisplay(props(text), UrlField),
  select: validatedDisplay(Type.Object({ value: scalar, options: choices }), SelectField, choiceProps),
  multiselect: multiChoiceDisplay,
  'tree-select': treeChoiceDisplay,
  treeselect: treeChoiceDisplay,
  cascader: multiChoiceDisplay,
  transfer: multiChoiceDisplay,
  relation: validatedDisplay(Type.Object({
    value: scalar, resourceName: Type.Optional(Type.String()),
  }), RelationField, input => definedOptions({ value: input.value, resourceName: input.resourceName })),
  json: validatedDisplay(props(nullable(jsonValueSchema)), JsonField),
  array: validatedDisplay(props(nullable(Type.Array(jsonValueSchema))), JsonField),
  color: textDisplay,
  password: validatedDisplay(props(text), PasswordField),
  richtext: validatedDisplay(props(text), RichTextField),
  textarea: validatedDisplay(props(text), RichTextField),
  number: validatedDisplay(props(numeric), NumberField),
  currency: validatedDisplay(props(numeric), CurrencyField),
  phone: validatedDisplay(props(scalar), PhoneField),
  percent: validatedDisplay(props(numeric), PercentField),
  rating: ratingDisplay,
  rate: ratingDisplay,
  code: validatedDisplay(props(nullable(jsonValueSchema)), CodeField),
  avatar: validatedDisplay(Type.Object({ src: text }), AvatarField, input => ({ src: input.value })),
  copy: validatedDisplay(props(scalar), CopyField),
  file: validatedDisplay(props(text), FileField),
  markdown: validatedDisplay(props(text), MarkdownField),
});

const customDisplayComponents = new Map<string, Component<FieldDisplayProps>>();

/** Custom renderers receive only values proven by their closed schema. */
export function registerDisplayComponent<const S extends TSchema>(
  fieldType: string,
  schema: S & SafeSchema<S>,
  component: Component<{ value: Static<NoInfer<S>> }>,
): void {
  if (!fieldType.trim()) throw new TypeError('A field type is required');
  const validator = createExactSchemaValidator<S>(closeContractSchema<S>(schema));
  const resolve = (input: FieldDisplayProps): { ok: true; props: { value: Static<S> } } | { ok: false } => {
    const value = input.value;
    return validator.Check(value) ? { ok: true, props: { value } } : { ok: false };
  };
  customDisplayComponents.set(fieldType, (internals, input) => ValidatedField(internals, { component, resolve, input }));
}

/**
 * Get the display component for a field type.
 * Custom components take precedence over built-in ones.
 * Returns undefined if no component is registered for the type.
 */
export function getDisplayComponent(fieldType: string): Component<FieldDisplayProps> | undefined {
  return customDisplayComponents.get(fieldType)
    ?? (Object.hasOwn(builtinDisplayComponents, fieldType) ? builtinDisplayComponents[fieldType] : undefined);
}

/**
 * Check if a field type has a display component (custom or built-in).
 */
export function hasDisplayComponent(fieldType: string): boolean {
  return getDisplayComponent(fieldType) !== undefined;
}
