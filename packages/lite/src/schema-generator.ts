/**
 * @svadmin/lite — Schema Generator
 *
 * Auto-generates TypeBox schemas from @svadmin/core FieldDefinitions.
 * Used by Lite server actions and high-speed JIT form validation.
 */
import { Type, type TSchema, type Static, type TObject } from "@sinclair/typebox";
import type { FieldDefinition, ResourceDefinition } from "@svadmin/core";
import { parseExplicitBoolean } from "./value-normalization";

function isNativeFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isNonEmptyNativeFile(value: unknown): value is File {
  return isNativeFile(value) && value.size > 0 && value.name !== "";
}

function normalizeSingleUpload(submittedUpload: unknown): unknown {
  if (submittedUpload === undefined || submittedUpload === null || submittedUpload === "") return undefined;
  if (isNativeFile(submittedUpload) && !isNonEmptyNativeFile(submittedUpload)) return undefined;
  return submittedUpload;
}

function hasRequiredValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isNativeFile(value)) return isNonEmptyNativeFile(value);
  return true;
}

function restoreOptionValue(field: FieldDefinition, submittedOption: unknown): unknown {
  const option = field.options?.find(
    (candidate) => String(candidate.value) === String(submittedOption),
  );
  return option?.value ?? submittedOption;
}

function normalizeImageEntries(submittedImages: unknown): unknown {
  if (submittedImages === undefined || submittedImages === null || submittedImages === "") return undefined;
  const entries = Array.isArray(submittedImages) ? submittedImages : [submittedImages];
  const normalized = entries.flatMap((entry) => {
    if (typeof entry !== "string") return [entry];
    return entry.split(/[\r\n]+/u).map((reference) => reference.trim()).filter(Boolean);
  }).filter((entry) => !isNativeFile(entry) || isNonEmptyNativeFile(entry));
  return normalized.length > 0 ? normalized : undefined;
}

export interface SchemaValidationIssue {
  path: (string | number)[];
  message: string;
}

export type SchemaValidationResult<T = Record<string, unknown>> =
  | { success: true; data: T; error?: never }
  | { success: false; error: { issues: SchemaValidationIssue[] }; data?: never };

export type TypeBoxEnhancedSchema<T = Record<string, unknown>> = TObject & {
  parse: (values: unknown) => T;
  safeParse: (values: unknown) => SchemaValidationResult<T>;
  Check: (values: unknown) => boolean;
  "~standard": {
    version: 1;
    vendor: "svadmin";
    validate: (values: unknown) => { value: T } | { issues: Array<{ message: string; path?: (string | number)[] }> };
  };
};

function coerceAndValidateField(
  field: FieldDefinition,
  value: unknown,
  mode: "create" | "edit",
  withinArray = false,
  path: (string | number)[] = [field.key],
): { value: unknown; issues: SchemaValidationIssue[] } {
  const issues: SchemaValidationIssue[] = [];

  let coerced: unknown = value;

  switch (field.type) {
    case "number": {
      if (coerced === undefined || coerced === null || coerced === "") {
        coerced = undefined;
        if (field.required) {
          issues.push({ path, message: `${field.label} is required` });
        }
      } else if (typeof coerced === "string") {
        const trimmed = coerced.trim();
        if (trimmed === "") {
          coerced = undefined;
          if (field.required) {
            issues.push({ path, message: `${field.label} is required` });
          }
        } else {
          const num = Number(trimmed);
          if (Number.isNaN(num)) {
            issues.push({ path, message: `${field.label} must be a number` });
          } else {
            coerced = num;
          }
        }
      } else if (typeof coerced === "number") {
        if (Number.isNaN(coerced)) {
          issues.push({ path, message: `${field.label} must be a number` });
        }
      } else {
        issues.push({ path, message: `${field.label} must be a number` });
      }
      break;
    }

    case "boolean": {
      if (coerced === undefined || coerced === null || coerced === "") {
        coerced = field.required ? false : undefined;
        if (field.required && coerced === undefined) {
          issues.push({ path, message: `${field.label} is required` });
        }
      } else if (typeof coerced === "boolean") {
        // ok
      } else if (typeof coerced === "string") {
        const parsed = parseExplicitBoolean(coerced);
        if (parsed === undefined) {
          issues.push({ path, message: `${field.label} must be a boolean` });
        } else {
          coerced = parsed;
        }
      } else if (typeof coerced === "number") {
        if (coerced === 1) coerced = true;
        else if (coerced === 0) coerced = false;
        else issues.push({ path, message: `${field.label} must be a boolean` });
      } else {
        issues.push({ path, message: `${field.label} must be a boolean` });
      }
      break;
    }

    case "email": {
      if (typeof coerced === "string" && coerced.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(coerced)) {
          issues.push({ path, message: `${field.label} must be a valid email` });
        }
      }
      break;
    }

    case "url": {
      if (typeof coerced === "string" && coerced.length > 0) {
        try {
          new URL(coerced);
        } catch {
          issues.push({ path, message: `${field.label} must be a valid URL` });
        }
      }
      break;
    }

    case "date": {
      if (typeof coerced === "string" && coerced.length > 0) {
        if (Number.isNaN(Date.parse(coerced))) {
          issues.push({ path, message: `${field.label} must be a valid date` });
        }
      }
      break;
    }

    case "select": {
      if (coerced !== undefined && coerced !== null && coerced !== "") {
        coerced = restoreOptionValue(field, coerced);
        const options = field.options ?? [];
        if (options.length > 0 && !options.some((opt) => Object.is(opt.value, coerced))) {
          issues.push({ path, message: `${field.label} must be one of the options` });
        }
      }
      break;
    }

    case "multiselect": {
      if (Array.isArray(coerced)) {
        coerced = coerced.map((item) => restoreOptionValue(field, item));
        const options = field.options ?? [];
        if (options.length > 0) {
          for (const item of coerced as unknown[]) {
            if (!options.some((opt) => Object.is(opt.value, item))) {
              issues.push({ path, message: `${field.label} must be one of the options` });
              break;
            }
          }
        }
      } else if (coerced === undefined || coerced === null || coerced === "") {
        coerced = [];
      }
      break;
    }

    case "relation": {
      if (field.options?.length && coerced !== undefined && coerced !== null && coerced !== "") {
        coerced = restoreOptionValue(field, coerced);
        if (!field.options.some((opt) => Object.is(opt.value, coerced))) {
          issues.push({ path, message: `${field.label} must be one of the options` });
        }
      }
      break;
    }

    case "array": {
      if (Array.isArray(coerced)) {
        if (field.required && coerced.length === 0) {
          issues.push({ path, message: `${field.label} must contain at least one item` });
        } else {
          const processedRows: Record<string, unknown>[] = [];
          for (let r = 0; r < coerced.length; r++) {
            const row = coerced[r];
            if (typeof row !== "object" || row === null) {
              issues.push({ path: [...path, r], message: "Row must be an object" });
              continue;
            }
            const rowObj = row as Record<string, unknown>;
            const processedRow: Record<string, unknown> = {};
            for (const subField of field.subFields ?? []) {
              const subRes = coerceAndValidateField(
                subField,
                rowObj[subField.key],
                mode,
                true,
                [...path, r, subField.key],
              );
              issues.push(...subRes.issues);
              if (subRes.value !== undefined) {
                processedRow[subField.key] = subRes.value;
              }
            }
            processedRows.push(processedRow);
          }
          coerced = processedRows;
        }
      } else if (coerced === undefined || coerced === null || coerced === "") {
        if (field.required) {
          issues.push({ path, message: `${field.label} must contain at least one item` });
        } else {
          coerced = [];
        }
      } else {
        issues.push({ path, message: `${field.label} must be an array` });
      }
      break;
    }

    case "tags": {
      if (typeof coerced === "string") {
        coerced = coerced ? coerced.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
      } else if (!Array.isArray(coerced)) {
        coerced = [];
      }
      break;
    }

    case "textarea":
    case "richtext":
    case "markdown": {
      if (typeof coerced === "string" && coerced.length > 50000) {
        issues.push({ path, message: `${field.label} is too long` });
      }
      break;
    }

    case "json": {
      if (typeof coerced === "string") {
        try {
          coerced = JSON.parse(coerced);
        } catch {
          issues.push({ path, message: `${field.label} must be valid JSON` });
        }
      }
      break;
    }

    case "phone": {
      if (typeof coerced === "string" && coerced.length > 0) {
        if (!/^[+\d\s()-]*$/.test(coerced)) {
          issues.push({ path, message: `${field.label} must be a valid phone number` });
        }
      }
      break;
    }

    case "file": {
      coerced = normalizeSingleUpload(coerced);
      const isFile = isNonEmptyNativeFile(coerced);
      const isStringRef = typeof coerced === "string" && coerced.trim().length > 0;
      const isRequired = field.required === true && (mode === "create" || withinArray);
      const allowRef = withinArray && mode === "edit";

      if (isRequired) {
        if (!isFile && (!allowRef || !isStringRef)) {
          issues.push({ path, message: `${field.label} must be a non-empty file` });
        }
      } else if (coerced !== undefined) {
        if (!isFile && (!allowRef || !isStringRef)) {
          issues.push({ path, message: `${field.label} must be a non-empty file` });
        }
      }
      break;
    }
    case "image": {
      coerced = normalizeSingleUpload(coerced);
      const isFile = isNonEmptyNativeFile(coerced);
      const isStringRef = typeof coerced === "string" && coerced.trim().length > 0;
      const isRequired = field.required === true;

      if (isRequired) {
        if (mode === "create" || withinArray) {
          if (!isFile && !isStringRef) {
            issues.push({ path, message: `${field.label} must reference an image or contain a non-empty file` });
          }
        } else if (mode === "edit") {
          if (coerced !== undefined && !isFile && !isStringRef) {
            issues.push({ path, message: `${field.label} must reference an image or contain a non-empty file` });
          }
        }
      }
      break;
    }

    case "images": {
      coerced = normalizeImageEntries(coerced);
      const isRequired = field.required === true;
      const entries = Array.isArray(coerced) ? coerced : (coerced ? [coerced] : []);

      if (isRequired && (mode === "create" || withinArray)) {
        if (entries.length === 0) {
          issues.push({ path, message: `${field.label} must contain at least one image` });
        }
      }
      break;
    }

    default:
      break;
  }

  // Check required
  if (field.type !== "number" && field.type !== "boolean" && field.type !== "array" && field.type !== "file" && field.type !== "image" && field.type !== "images") {
    if (field.required && !hasRequiredValue(coerced)) {
      issues.push({ path, message: `${field.label} is required` });
    }
  }

  // Custom validate
  if (field.validate && issues.length === 0 && coerced !== undefined && coerced !== null && coerced !== "") {
    const customMessage = field.validate(coerced);
    if (customMessage) {
      issues.push({ path, message: customMessage });
    }
  }

  return { value: coerced, issues };
}

/**
 * Generate a TypeBox object schema from a list of FieldDefinitions.
 */
export function fieldsToTypeBoxSchema(
  fields: FieldDefinition[],
  mode: "create" | "edit" = "create",
): TypeBoxEnhancedSchema {
  const shape: Record<string, TSchema> = {};
  const activeFields: FieldDefinition[] = [];

  for (const field of fields) {
    if (field.showInForm === false) continue;
    if (mode === "create" && field.showInCreate === false) continue;
    if (mode === "edit" && field.showInEdit === false) continue;

    activeFields.push(field);

    switch (field.type) {
      case "number":
        shape[field.key] = field.required ? Type.Number() : Type.Optional(Type.Number());
        break;
      case "boolean":
        shape[field.key] = field.required ? Type.Boolean() : Type.Optional(Type.Boolean());
        break;
      case "array":
        shape[field.key] = field.required ? Type.Array(Type.Any(), { minItems: 1 }) : Type.Optional(Type.Array(Type.Any()));
        break;
      default:
        shape[field.key] = field.required ? Type.Any() : Type.Optional(Type.Any());
        break;
    }
  }

  const baseSchema = Type.Object(shape, { additionalProperties: true });

  const safeParse = (values: unknown): SchemaValidationResult => {
    if (typeof values !== "object" || values === null) {
      return {
        success: false,
        error: { issues: [{ path: ["_root"], message: "Values must be an object" }] },
      };
    }

    const input = values as Record<string, unknown>;
    const resultData: Record<string, unknown> = {};
    const allIssues: SchemaValidationIssue[] = [];

    for (const field of activeFields) {
      const val = input[field.key];
      const fieldRes = coerceAndValidateField(field, val, mode, false, [field.key]);
      allIssues.push(...fieldRes.issues);
      if (fieldRes.value !== undefined) {
        resultData[field.key] = fieldRes.value;
      }
    }

    if (allIssues.length > 0) {
      return {
        success: false,
        error: { issues: allIssues },
      };
    }

    return {
      success: true,
      data: resultData,
    };
  };

  const parse = (values: unknown): Record<string, unknown> => {
    const res = safeParse(values);
    if (!res.success) {
      const err = new Error(res.error?.issues[0]?.message || "Validation failed") as Error & {
        issues: SchemaValidationIssue[];
      };
      err.issues = res.error?.issues ?? [];
      throw err;
    }
    return res.data!;
  };

  return Object.assign(baseSchema, {
    parse,
    safeParse,
    Check: (val: unknown) => safeParse(val).success,
    "~standard": {
      version: 1 as const,
      vendor: "svadmin" as const,
      validate: (val: unknown) => {
        const res = safeParse(val);
        if (res.success) {
          return { value: res.data! };
        }
        return {
          issues: (res.error?.issues ?? []).map((iss) => ({
            message: iss.message,
            path: iss.path,
          })),
        };
      },
    },
  });
}

/**
 * Generate a TypeBox schema from a ResourceDefinition.
 * Convenience wrapper around fieldsToTypeBoxSchema.
 */
export function resourceToTypeBoxSchema(
  resource: ResourceDefinition,
  mode: "create" | "edit" = "create",
): TypeBoxEnhancedSchema {
  const primaryKey = resource.primaryKey ?? "id";
  return fieldsToTypeBoxSchema(
    resource.fields.filter((field) => field.key !== primaryKey),
    mode,
  );
}

/**
 * Backward compatibility alias for fieldsToTypeBoxSchema
 */
export const fieldsToZodSchema = fieldsToTypeBoxSchema;

/**
 * Backward compatibility alias for resourceToTypeBoxSchema
 */
export const resourceToZodSchema = resourceToTypeBoxSchema;

/**
 * Determine a conservative HTML input type for server-rendered forms.
 */
export function fieldToInputType(field: FieldDefinition): string {
  switch (field.type) {
    case "number": return "text";
    case "email": return "text";
    case "url": return "text";
    case "phone": return "tel";
    case "boolean": return "checkbox";
    case "date": return "text";
    case "textarea":
    case "richtext":
    case "markdown":
    case "images": return "textarea";
    case "json": return "textarea";
    case "select":
    case "multiselect": return "select";
    case "relation": return field.options?.length ? "select" : "text";
    case "array": return "text";
    case "file": return "file";
    case "password": return "password";
    default: return "text";
  }
}

/**
 * Generate an input placeholder with a portable format hint.
 */
export function fieldToPlaceholder(field: FieldDefinition): string {
  switch (field.type) {
    case "date": return "YYYY-MM-DD";
    case "email": return "user@example.com";
    case "url": return "https://example.com";
    case "phone": return "+1 (555) 000-0000";
    case "number": return "0";
    default: return "";
  }
}
