/**
 * @svadmin/lite — Schema Generator
 *
 * Auto-generates Zod schemas from @svadmin/core FieldDefinitions.
 * Used by the Lite server actions and compatible with other Zod consumers.
 */
import { z } from 'zod';
import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';
import { parseExplicitBoolean } from './value-normalization';

function isNativeFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function isNonEmptyNativeFile(value: unknown): value is File {
  return isNativeFile(value) && value.size > 0 && value.name !== '';
}

function normalizeSingleUpload(submittedUpload: unknown): unknown {
  if (submittedUpload === undefined || submittedUpload === null || submittedUpload === '') return undefined;
  if (isNativeFile(submittedUpload) && !isNonEmptyNativeFile(submittedUpload)) return undefined;
  return submittedUpload;
}

function hasRequiredValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isNativeFile(value)) return isNonEmptyNativeFile(value);
  return true;
}

function applyCustomValidation(
  schema: z.ZodTypeAny,
  field: FieldDefinition,
): z.ZodTypeAny {
  if (!field.validate) return schema;

  return schema.superRefine((parsedFieldValue, context) => {
    if (parsedFieldValue === undefined || parsedFieldValue === null || parsedFieldValue === '') return;
    const message = field.validate?.(parsedFieldValue);
    if (message) context.addIssue({ code: 'custom', message });
  });
}

function numberFieldToZod(field: FieldDefinition): z.ZodTypeAny {
  const numberSchema = z.coerce.number({ message: `${field.label} must be a number` });
  const targetSchema = field.required ? numberSchema : numberSchema.optional();

  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  }, targetSchema);
}

function booleanFieldToZod(field: FieldDefinition): z.ZodTypeAny {
  const booleanSchema = z.boolean();
  const targetSchema = field.required ? booleanSchema : booleanSchema.optional();

  return z.preprocess((rawBoolean) => {
    if (rawBoolean === undefined || rawBoolean === null || rawBoolean === '') return undefined;
    return parseExplicitBoolean(rawBoolean) ?? rawBoolean;
  }, targetSchema);
}

function restoreOptionValue(field: FieldDefinition, submittedOption: unknown): unknown {
  const option = field.options?.find(
    (candidate) => String(candidate.value) === String(submittedOption),
  );
  return option?.value ?? submittedOption;
}

function optionValueSchema(field: FieldDefinition): z.ZodTypeAny {
  const options = field.options ?? [];
  return z.union([z.string(), z.number()]).refine(
    (parsedOption) => options.length === 0
      || options.some((option) => Object.is(option.value, parsedOption)),
    { message: `${field.label} must be one of the options` },
  );
}

function singleOptionFieldToZod(field: FieldDefinition): z.ZodTypeAny {
  return z.preprocess(
    (submittedOption) => restoreOptionValue(field, submittedOption),
    optionValueSchema(field),
  );
}

function multipleOptionFieldToZod(field: FieldDefinition): z.ZodTypeAny {
  return z.preprocess(
    (submittedOptions) => Array.isArray(submittedOptions)
      ? submittedOptions.map((submittedOption) => restoreOptionValue(field, submittedOption))
      : submittedOptions,
    z.array(optionValueSchema(field)).default([]),
  );
}

function singleFileFieldToZod(
  field: FieldDefinition,
  options: { required: boolean; allowReference: boolean },
): z.ZodTypeAny {
  const fileSchema = z.custom<File>(isNonEmptyNativeFile, {
    message: `${field.label} must be a non-empty file`,
  });
  const referenceSchema = z.string().trim().min(1, `${field.label} must reference an existing file`);
  const uploadSchema = options.allowReference ? z.union([fileSchema, referenceSchema]) : fileSchema;
  const targetSchema = options.required ? uploadSchema : uploadSchema.optional();

  return z.preprocess(normalizeSingleUpload, targetSchema);
}

function imageFieldSchemas(field: FieldDefinition) {
  const imageSchema = z.union([
    z.string().trim().min(1, `${field.label} must reference an image`),
    z.custom<File>(isNonEmptyNativeFile, {
      message: `${field.label} must reference an image or contain a non-empty file`,
    }),
  ]);
  return {
    required: z.preprocess(normalizeSingleUpload, imageSchema),
    optional: z.preprocess(normalizeSingleUpload, imageSchema.optional()),
  };
}

function normalizeImageEntries(submittedImages: unknown): unknown {
  if (submittedImages === undefined || submittedImages === null || submittedImages === '') return undefined;
  const entries = Array.isArray(submittedImages) ? submittedImages : [submittedImages];
  const normalized = entries.flatMap((entry) => {
    if (typeof entry !== 'string') return [entry];
    return entry.split(/[\r\n]+/u).map((reference) => reference.trim()).filter(Boolean);
  }).filter((entry) => !isNativeFile(entry) || isNonEmptyNativeFile(entry));
  return normalized.length > 0 ? normalized : undefined;
}

function imagesFieldSchemas(field: FieldDefinition) {
  const imageEntrySchema = z.union([
    z.string().trim().min(1, `${field.label} contains an empty image reference`),
    z.custom<File>(isNonEmptyNativeFile, {
      message: `${field.label} contains an empty or invalid file`,
    }),
  ]);
  const requiredImages = z.array(imageEntrySchema)
    .min(1, `${field.label} must contain at least one image`);
  return {
    required: z.preprocess(normalizeImageEntries, requiredImages),
    optional: z.preprocess(normalizeImageEntries, z.array(imageEntrySchema).optional()),
  };
}

/**
 * Convert a single FieldDefinition to its corresponding Zod type.
 */
function fieldToZod(
  field: FieldDefinition,
  mode: 'create' | 'edit',
  withinArray = false,
): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'number':
      return numberFieldToZod(field);
    case 'boolean':
      return booleanFieldToZod(field);
    case 'email':
      schema = z.string().email(`${field.label} must be a valid email`);
      break;
    case 'url':
      schema = z.string().url(`${field.label} must be a valid URL`);
      break;
    case 'date':
      schema = z.string().refine(
        (v: string | undefined) => !v || !isNaN(Date.parse(v)),
        { message: `${field.label} must be a valid date` },
      );
      break;
    case 'select':
      schema = singleOptionFieldToZod(field);
      break;
    case 'multiselect':
      schema = multipleOptionFieldToZod(field);
      break;
    case 'relation':
      schema = field.options?.length ? singleOptionFieldToZod(field) : z.string();
      break;
    case 'array': {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const subField of field.subFields ?? []) {
        shape[subField.key] = applyCustomValidation(
          fieldToZod(subField, mode, true),
          subField,
        );
      }
      const arraySchema = z.array(z.object(shape));
      return field.required
        ? arraySchema.min(1, `${field.label} must contain at least one item`)
        : arraySchema.optional().or(z.literal(''));
    }
    case 'tags':
      schema = z.union([
        z.array(z.string()),
        z.string().transform((value: string) => value ? value.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []),
      ]);
      break;
    case 'textarea':
    case 'richtext':
    case 'markdown':
      schema = z.string().max(50000, `${field.label} is too long`);
      break;
    case 'json':
      schema = z.unknown().transform((value, context) => {
        if (typeof value !== 'string') return value;
        try {
          return JSON.parse(value) as unknown;
        } catch {
          context.addIssue({ code: 'custom', message: `${field.label} must be valid JSON` });
          return z.NEVER;
        }
      });
      break;
    case 'phone':
      schema = z.string().regex(/^[+\d\s()-]*$/, `${field.label} must be a valid phone number`);
      break;
    case 'file':
      return singleFileFieldToZod(field, {
        required: field.required === true && (mode === 'create' || withinArray),
        allowReference: mode === 'edit' && withinArray,
      });
    case 'image': {
      const imageSchemas = imageFieldSchemas(field);
      return field.required === true && (mode === 'create' || withinArray)
        ? imageSchemas.required
        : imageSchemas.optional;
    }
    case 'images': {
      const imagesSchemas = imagesFieldSchemas(field);
      return field.required === true && (mode === 'create' || withinArray)
        ? imagesSchemas.required
        : imagesSchemas.optional;
    }
    default:
      schema = z.string();
  }

  // Enforce meaningful values for required fields, including nested array rows.
  if (field.required) {
    schema = schema.refine(hasRequiredValue, { message: `${field.label} is required` });
  } else {
    schema = schema.optional().or(z.literal(''));
  }

  return schema;
}

/**
 * Generate a Zod object schema from a ResourceDefinition's fields.
 * Only includes fields that are relevant for form rendering.
 *
 * @param mode - 'create' | 'edit' to filter fields by showInCreate / showInEdit
 */
export function fieldsToZodSchema(
  fields: FieldDefinition[],
  mode: 'create' | 'edit' = 'create',
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    // Skip fields not shown in forms
    if (field.showInForm === false) continue;
    if (mode === 'create' && field.showInCreate === false) continue;
    if (mode === 'edit' && field.showInEdit === false) continue;

    shape[field.key] = applyCustomValidation(fieldToZod(field, mode), field);
  }

  return z.object(shape);
}

/**
 * Generate a Zod schema from a ResourceDefinition.
 * Convenience wrapper around fieldsToZodSchema.
 */
export function resourceToZodSchema(
  resource: ResourceDefinition,
  mode: 'create' | 'edit' = 'create',
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const primaryKey = resource.primaryKey ?? 'id';
  return fieldsToZodSchema(
    resource.fields.filter((field) => field.key !== primaryKey),
    mode,
  );
}

/**
 * Determine a conservative HTML input type for server-rendered forms.
 * Text fallbacks avoid inconsistent native validation and date widgets.
 */
export function fieldToInputType(field: FieldDefinition): string {
  switch (field.type) {
    case 'number': return 'text';
    case 'email': return 'text';
    case 'url': return 'text';
    case 'phone': return 'tel';
    case 'boolean': return 'checkbox';
    case 'date': return 'text';
    case 'textarea':
    case 'richtext':
    case 'markdown':
    case 'images': return 'textarea';
    case 'json': return 'textarea';
    case 'select':
    case 'multiselect': return 'select';
    case 'relation': return field.options?.length ? 'select' : 'text';
    case 'array': return 'text';
    case 'file': return 'file';
    case 'password': return 'password';
    default: return 'text';
  }
}

/**
 * Generate an input placeholder with a portable format hint.
 */
export function fieldToPlaceholder(field: FieldDefinition): string {
  switch (field.type) {
    case 'date': return 'YYYY-MM-DD';
    case 'email': return 'user@example.com';
    case 'url': return 'https://example.com';
    case 'phone': return '+1 (555) 000-0000';
    case 'number': return '0';
    default: return '';
  }
}
