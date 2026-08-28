// Refine v5 compatible utility helpers

import { t } from './i18n.svelte';
import { getTextTransformers } from './options.svelte';

// ─── Re-export pure utilities (testable without Svelte runtime) ───
export {
  getDefaultFilter, getDefaultSortOrder,
  unionFilters, unionSorters,
  file2Base64, parseCSV,
  createSchemaValidator,
  createTypeBoxValidator,
} from './helpers-pure';
export type { SchemaValidatorLike, TypeBoxValidatorLike } from './helpers-pure';


// ─── Document Title Helper ────────────────────────────────────

/**
 * Generate a default document title for a resource page.
 * e.g., "Edit Post #5 | Admin" or "Posts | Admin"
 */
export function generateDefaultDocumentTitle(options?: {
  resource?: string;
  action?: string;
  id?: string | number;
  suffix?: string;
}): string {
  const { resource, action, id, suffix = ' | Admin' } = options ?? {};
  const transformers = getTextTransformers();

  if (!resource) {
    return t('documentTitle.default', {}) || `Admin${suffix}`;
  }

  const resourceLabel = transformers.humanize
    ? transformers.humanize(resource)
    : resource.charAt(0).toUpperCase() + resource.slice(1);

  const actionPrefixes: Record<string, string> = {
    create: `${t('common.create', {}) || 'Create'} `,
    clone: `#${id ?? ''} ${t('common.clone', {}) || 'Clone'} `,
    edit: `#${id ?? ''} ${t('common.edit', {}) || 'Edit'} `,
    show: `#${id ?? ''} ${t('common.detail', {}) || 'Show'} `,
    list: '',
  };

  const prefix = action ? (actionPrefixes[action] ?? '') : '';
  return `${prefix}${resourceLabel}${suffix}`;
}

// ─── Form Validation Derivation ─────────────────────────────────

/**
 * Derive a `useForm`-compatible `validate` function from `FieldDefinition[]`.
 *
 * Automatically validates:
 * - `required` fields (non-empty check)
 * - `type === 'email'` fields (basic email format)
 * - `type === 'url'` fields (basic URL format)
 * - `type === 'number'` fields (must be a valid number)
 * - Custom per-field `field.validate()` callback
 *
 * This eliminates the need for hand-written Zod schemas in most CRUD scenarios.
 *
 * @example
 * ```ts
 * const form = useForm({
 *   resource: 'users',
 *   validate: deriveValidator(resource.fields),
 * });
 * ```
 */
export function deriveValidator(
  fields: import('./types').FieldDefinition[],
  options?: {
    /** Only validate these field keys. Default: all fields. */
    only?: string[];
    /** Skip these field keys. */
    except?: string[];
    /** Captured tree-local translator for validation that runs after component initialization. */
    translate?: typeof t;
  }
): (values: Record<string, unknown>) => Record<string, string> | null {
  const translate = options?.translate ?? t;

  return (values: Record<string, unknown>) => {
    const errors: Record<string, string> = {};
    const only = options?.only ? new Set(options.only) : null;
    const except = options?.except ? new Set(options.except) : null;

    for (const field of fields) {
      if (only && !only.has(field.key)) continue;
      if (except && except.has(field.key)) continue;

      const value = values[field.key];

      // Required check
      if (field.required) {
        if (value === undefined || value === null || value === '') {
          errors[field.key] = translate('validation.required');
          continue;
        }
        // Empty array check for multi-value fields
        if (Array.isArray(value) && value.length === 0 && (field.type === 'multiselect' || field.type === 'tags')) {
          errors[field.key] = translate('validation.required');
          continue;
        }
      }

      // Skip further checks for empty non-required fields
      if (value === undefined || value === null || value === '') continue;

      // Type-specific validation
      switch (field.type) {
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof value === 'string' && !emailRegex.test(value)) {
            errors[field.key] = translate('validation.invalidEmail');
          }
          break;
        }
        case 'url': {
          try {
            new URL(value as string);
          } catch {
            errors[field.key] = translate('validation.invalidUrl');
          }
          break;
        }
        case 'number': {
          if (typeof value === 'string' && isNaN(Number(value))) {
            errors[field.key] = translate('validation.invalidNumber');
          } else if (typeof value === 'number' && isNaN(value)) {
            errors[field.key] = translate('validation.invalidNumber');
          } else if (typeof value !== 'string' && typeof value !== 'number') {
            errors[field.key] = translate('validation.invalidNumber');
          }
          break;
        }
      }

      // Custom per-field validator (always runs last, can override type checks)
      if (field.validate && !errors[field.key]) {
        const msg = field.validate(value);
        if (msg) { errors[field.key] = msg; }
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };
}
