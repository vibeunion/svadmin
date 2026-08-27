/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared field type → display component mapping
// Used by both ShowPage and FieldRenderer to avoid duplicate if/else chains.
// Components are lazily resolved by field type at runtime.

import type { Component } from 'svelte';

export interface FieldComponentMap {
  [fieldType: string]: Component<any>;
}

// Pre-import all field display components (tree-shaken by bundler)
import TextField from './fields/TextField.svelte';
import BooleanField from './fields/BooleanField.svelte';
import ImageField from './fields/ImageField.svelte';
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

/**
 * Built-in display components for show/detail pages.
 * Keys match FieldDefinition.type values.
 */
export const builtinDisplayComponents: FieldComponentMap = {
  text: TextField,
  string: TextField,
  boolean: BooleanField,
  image: ImageField,
  images: ImageField,
  tags: TagField,
  date: DateField,
  daterange: DateRangeField,
  email: EmailField,
  url: UrlField,
  select: SelectField,
  multiselect: MultiSelectField,
  relation: RelationField,
  json: JsonField,
  richtext: RichTextField,
  textarea: RichTextField,
  number: NumberField,
  currency: CurrencyField,
  phone: PhoneField,
  percent: PercentField,
  rating: RatingField,
  code: CodeField,
  avatar: AvatarField,
  copy: CopyField,
  file: FileField,
  markdown: MarkdownField,
};

// ─── Custom component registry ─────────────────────────────────
// Users can register custom field display components at runtime

const customDisplayComponents = new Map<string, Component<any>>();

/**
 * Register a custom field display component for a given field type.
 * The component will be used by ShowPage and any other display contexts.
 */
export function registerDisplayComponent(fieldType: string, component: Component<any>): void {
  customDisplayComponents.set(fieldType, component);
}

/**
 * Get the display component for a field type.
 * Custom components take precedence over built-in ones.
 * Returns undefined if no component is registered for the type.
 */
export function getDisplayComponent(fieldType: string): Component<any> | undefined {
  return customDisplayComponents.get(fieldType) ?? builtinDisplayComponents[fieldType];
}

/**
 * Check if a field type has a display component (custom or built-in).
 */
export function hasDisplayComponent(fieldType: string): boolean {
  return customDisplayComponents.has(fieldType) || fieldType in builtinDisplayComponents;
}
