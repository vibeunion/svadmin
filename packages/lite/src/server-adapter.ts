/**
 * @svadmin/lite — Server Adapter
 *
 * Bridges @svadmin/core DataProvider into SvelteKit server loaders and form actions.
 * All data fetching happens on the server; optional client-side enhancement is
 * limited to interaction affordances such as dynamic array rows.
 */
import type {
  DataProvider, AuthProvider, AuthActionResult,
  ResourceDefinition, FieldDefinition,
  Sort, Filter,
} from '@svadmin/core';
import { redirect, isRedirect, type RequestEvent } from '@sveltejs/kit';
import { resourceToTypeBoxSchema } from './schema-generator';
import { parseExplicitBoolean } from './value-normalization';

// ─── List Loader ──────────────────────────────────────────────

export interface ListLoaderResult {
  records: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  /** Aliases consumed directly by LiteListPage. */
  pagination: { page: number; perPage: number };
  currentSort?: string;
  currentOrder?: 'asc' | 'desc';
  currentSearch?: string;
  currentFilters?: Record<string, string>;
  resource: ResourceDefinition;
}

interface ListRequestState {
  page: number;
  pageSize: number;
  sort?: string;
  order: 'asc' | 'desc';
  search?: string;
}

function listRequestState(url: URL, resource: ResourceDefinition): ListRequestState {
  const requestedPage = Number(url.searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const configuredPageSize = resource.pageSize ?? 10;
  const pageSize = Number.isSafeInteger(configuredPageSize) && configuredPageSize > 0
    ? configuredPageSize
    : 10;
  const requestedSort = url.searchParams.get('sort') ?? undefined;
  const sortableField = requestedSort
    ? resource.fields.find((field) => field.key === requestedSort && field.sortable !== false)
    : undefined;
  const sort = sortableField?.key ?? resource.defaultSort?.field;
  const requestedOrder = url.searchParams.get('order');
  const order: 'asc' | 'desc' = sortableField
    ? requestedOrder === 'asc' || requestedOrder === 'desc' ? requestedOrder : 'asc'
    : resource.defaultSort?.order ?? 'asc';
  return { page, pageSize, sort, order, search: url.searchParams.get('q') ?? undefined };
}

function listRequestFilterValues(resource: ResourceDefinition, url: URL): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of resource.fields) {
    const raw = url.searchParams.get(`filter_${field.key}`) ?? (field.key !== "q" && field.key !== "sort" && field.key !== "order" && field.key !== "page" ? url.searchParams.get(field.key) : null);
    if (raw != null && raw.trim() !== "") {
      values[field.key] = raw.trim();
    }
  }
  return values;
}

function listRequestFilters(resource: ResourceDefinition, url: URL): Filter[] {
  const filters: Filter[] = [];
  const search = url.searchParams.get('q') ?? undefined;
  if (search) {
    const searchFilters: Filter[] = resource.fields
      .filter((field) => field.searchable)
      .map((field) => ({
        field: field.key,
        operator: 'contains',
        value: search,
      }));
    if (searchFilters.length === 1) {
      filters.push(searchFilters[0]);
    } else if (searchFilters.length > 1) {
      filters.push({ operator: 'or', value: searchFilters });
    }
  }

  for (const field of resource.fields) {
    const rawVal = url.searchParams.get(`filter_${field.key}`) ?? (field.key !== 'q' && field.key !== 'sort' && field.key !== 'order' && field.key !== 'page' ? url.searchParams.get(field.key) : null);
    if (rawVal != null && rawVal.trim() !== '') {
      filters.push({
        field: field.key,
        operator: 'eq',
        value: field.type === 'number' && !Number.isNaN(Number(rawVal)) ? Number(rawVal) : rawVal,
      });
    }
  }

  return filters;
}

/**
 * Creates a SvelteKit `load` function that fetches a resource list
 * via the DataProvider. All state is driven by URL search params.
 */
export function createListLoader(
  dp: DataProvider,
  resource: ResourceDefinition,
) {
  return async ({ url }: { url: URL }): Promise<ListLoaderResult> => {
    const { page, pageSize, sort, order, search } = listRequestState(url, resource);
    const sorters: Sort[] = sort ? [{ field: sort, order }] : [];
    const listResponse = await dp.getList({
      resource: resource.name,
      pagination: { current: page, pageSize },
      sorters,
      filters: listRequestFilters(resource, url),
    });

    return {
      records: listResponse.data as Record<string, unknown>[],
      total: listResponse.total,
      page,
      pageSize,
      totalPages: Math.ceil(listResponse.total / pageSize),
      sort,
      order,
      search,
      pagination: { page, perPage: pageSize },
      currentSort: sort,
      currentOrder: order,
      currentSearch: search,
      currentFilters: listRequestFilterValues(resource, url),
      resource,
    };
  };
}

// ─── Detail Loader ────────────────────────────────────────────

export function createDetailLoader(
  dp: DataProvider,
  resource: ResourceDefinition,
) {
  return async ({ params }: { params: { id: string } }) => {
    const result = await dp.getOne({
      resource: resource.name,
      id: params.id,
    });
    return { record: result.data as Record<string, unknown>, resource };
  };
}

// ─── CRUD Form Actions ────────────────────────────────────────

/**
 * Creates SvelteKit form actions for create / update / delete.
 * Works with standard `<form method="POST">` submissions — no JS needed.
 */
export function createCrudActions(
  dp: DataProvider,
  resource: ResourceDefinition,
) {
  const pk = resource.primaryKey ?? 'id';

  return {
    create: async ({ request }: RequestEvent) => {
      if (resource.canCreate === false) {
        return { success: false, error: 'Create is disabled for this resource' };
      }
      const formData = await request.formData();
      const submittedValues = formDataToObject(formData, resource.fields);
      const validation = validateFormVariables(resource, 'create', submittedValues);
      if (!validation.success) return validation.failure;
      const variables = validation.data;
      try {
        const result = await dp.create({ resource: resource.name, variables });
        return { success: true, id: (result.data as Record<string, unknown>)[pk] };
      } catch (caughtError) {
        if (isRedirect(caughtError)) throw caughtError;
        return {
          success: false,
          error: 'Create failed',
          values: formValuesForResponse(resource.fields, variables),
        };
      }
    },

    update: async ({ request }: RequestEvent) => {
      if (resource.canEdit === false) {
        return { success: false, error: 'Edit is disabled for this resource' };
      }
      const formData = await request.formData();
      const id = readRecordId(formData.get('_id'));
      if (!id) return { success: false, error: 'Missing record id' };
      formData.delete('_id');
      const submittedValues = formDataToObject(formData, resource.fields);
      const validation = validateFormVariables(resource, 'edit', submittedValues);
      if (!validation.success) return validation.failure;
      const variables = validation.data;
      try {
        await dp.update({ resource: resource.name, id, variables });
        return { success: true };
      } catch (caughtError) {
        if (isRedirect(caughtError)) throw caughtError;
        return {
          success: false,
          error: 'Update failed',
          values: formValuesForResponse(resource.fields, variables),
        };
      }
    },

    delete: async ({ request }: RequestEvent) => {
      if (resource.canDelete === false) {
        return { success: false, error: 'Delete is disabled for this resource' };
      }
      const formData = await request.formData();
      const id = readRecordId(formData.get('id'));
      if (!id) return { success: false, error: 'Missing record id' };
      const redirectTo = toSafeLocalRedirect(formData.get('redirect'));
      try {
        await dp.deleteOne({ resource: resource.name, id });
        if (redirectTo) throw redirect(303, redirectTo);
        return { success: true };
      } catch (caughtError) {
        if (isRedirect(caughtError)) throw caughtError;
        return { success: false, error: 'Delete failed' };
      }
    },

    batchDelete: async ({ request }: RequestEvent) => {
      if (resource.canDelete === false) {
        return { success: false, error: 'Delete is disabled for this resource' };
      }
      const formData = await request.formData();
      const ids = formData.getAll('ids').map(v => String(v).trim()).filter(Boolean);
      if (ids.length === 0) return { success: false, error: 'No records selected' };
      const redirectTo = toSafeLocalRedirect(formData.get('redirect'));
      try {
        if (dp.deleteMany) {
          await dp.deleteMany({ resource: resource.name, ids });
        } else {
          await Promise.all(ids.map(id => dp.deleteOne({ resource: resource.name, id })));
        }
        if (redirectTo) throw redirect(303, redirectTo);
        return { success: true };
      } catch (caughtError) {
        if (isRedirect(caughtError)) throw caughtError;
        return { success: false, error: 'Batch delete failed' };
      }
    },
  };
}

// ─── Auth Helpers ─────────────────────────────────────────────

/**
 * Creates a SvelteKit server hook that checks auth via AuthProvider
 * and redirects unauthenticated users to a login page.
 */
export function createAuthGuard(
  authProvider: AuthProvider,
  loginPath = '/lite/login',
) {
  const loginSegmentStart = loginPath.lastIndexOf('/');
  const authBasePath = loginSegmentStart > 0
    ? loginPath.slice(0, loginSegmentStart)
    : '';
  const allowedPublicPaths = new Set([
    loginPath,
    `${authBasePath}/register`,
    `${authBasePath}/forgot-password`,
    `${authBasePath}/update-password`,
  ]);

  return async ({ event, resolve }: { event: RequestEvent; resolve: (event: RequestEvent) => Promise<Response> }) => {
    if (allowedPublicPaths.has(event.url.pathname)) {
      return resolve(event);
    }

    try {
      const check = await authProvider.check();
      if (!check.authenticated) {
        event.cookies.delete('svadmin-session', { path: '/' });
        return new Response(null, {
          status: 302,
          headers: { Location: toSafeLocalRedirect(check.redirectTo) ?? loginPath },
        });
      }
    } catch {
      // Authentication checks fail closed so provider errors never expose a protected page.
      event.cookies.delete('svadmin-session', { path: '/' });
      return new Response(null, {
        status: 302,
        headers: { Location: loginPath },
      });
    }
    return resolve(event);
  };
}

/**
 * Creates the form actions used by all exported Lite authentication pages.
 */
export function createAuthActions(authProvider: AuthProvider) {
  type AuthFormMethod = (params: Record<string, unknown>) => Promise<AuthActionResult>;

  async function readAuthParams(request: Request): Promise<Record<string, unknown>> {
    return Object.fromEntries(await request.formData());
  }

  function validatePasswordConfirmation(authParams: Record<string, unknown>):
    | { valid: true; providerParams: Record<string, unknown> }
    | { valid: false; error: string } {
    const { confirmPassword, ...providerParams } = authParams;
    const password = authParams.password;
    if (typeof password !== 'string'
      || password.length === 0
      || typeof confirmPassword !== 'string'
      || confirmPassword.length === 0) {
      return { valid: false, error: 'Password and confirmation are required' };
    }
    if (password !== confirmPassword) {
      return { valid: false, error: 'Passwords do not match' };
    }
    return { valid: true, providerParams };
  }

  async function runAuthFormAction(
    providerMethod: AuthFormMethod | undefined,
    authParams: Record<string, unknown>,
    unsupportedMessage: string,
    failureMessage: string,
  ) {
    if (!providerMethod) return { success: false, error: unsupportedMessage };
    try {
      const authResult = await providerMethod.call(authProvider, authParams);
      if (!authResult.success) {
        return { success: false, error: authResult.error?.message ?? 'Authentication action failed' };
      }
      if (authResult.redirectTo) throw redirect(303, authResult.redirectTo);
      return { success: true };
    } catch (caughtError) {
      if (isRedirect(caughtError)) throw caughtError;
      return { success: false, error: failureMessage };
    }
  }

  return {
    login: async ({ request, cookies, url }: RequestEvent) => {
      const authParams = await readAuthParams(request);
      try {
        const loginResult = await authProvider.login(authParams);
        if (loginResult.success) {
          cookies.set('svadmin-session', 'active', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: url.protocol === 'https:',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
          throw redirect(303, loginResult.redirectTo ?? '/lite');
        }
        return { success: false, error: loginResult.error?.message ?? 'Login failed' };
      } catch (caughtError) {
        if (isRedirect(caughtError)) throw caughtError;
        return { success: false, error: 'Login failed' };
      }
    },

    logout: async ({ cookies }: RequestEvent) => {
      let logoutResult: AuthActionResult;
      try {
        logoutResult = await authProvider.logout();
      } catch {
        cookies.delete('svadmin-session', { path: '/' });
        return { success: false, error: 'Logout failed' };
      }
      cookies.delete('svadmin-session', { path: '/' });
      if (!logoutResult.success) {
        return { success: false, error: logoutResult.error?.message ?? 'Logout failed' };
      }
      if (logoutResult.redirectTo) throw redirect(303, logoutResult.redirectTo);
      return { success: true };
    },

    register: async ({ request }: RequestEvent) => {
      const confirmation = validatePasswordConfirmation(await readAuthParams(request));
      if (!confirmation.valid) return { success: false, error: confirmation.error };
      return runAuthFormAction(
        authProvider.register,
        confirmation.providerParams,
        'Registration is not supported by this AuthProvider',
        'Registration failed',
      );
    },

    forgot_password: async ({ request }: RequestEvent) => runAuthFormAction(
      authProvider.forgotPassword,
      await readAuthParams(request),
      'Password recovery is not supported by this AuthProvider',
      'Password recovery failed',
    ),

    update_password: async ({ request }: RequestEvent) => {
      const confirmation = validatePasswordConfirmation(await readAuthParams(request));
      if (!confirmation.valid) return { success: false, error: confirmation.error };
      return runAuthFormAction(
        authProvider.updatePassword,
        confirmation.providerParams,
        'Password updates are not supported by this AuthProvider',
        'Password update failed',
      );
    },

    update_profile: async ({ request }: RequestEvent) => runAuthFormAction(
      (authProvider.updateProfile ?? authProvider.updateIdentity) as AuthFormMethod | undefined,
      await readAuthParams(request),
      'Profile updates are not supported by this AuthProvider',
      'Profile update failed',
    ),
  };
}

// ─── UA Detection ─────────────────────────────────────────────

/**
 * Detects IE11 user agents for applications that maintain a dedicated fallback.
 * This helper does not imply that Svelte 5 or the consuming app supports IE11.
 */
export function isLegacyBrowser(userAgent: string): boolean {
  return /MSIE|Trident|rv:11/.test(userAgent);
}

/**
 * Creates an opt-in SvelteKit hook that redirects detected IE11 user agents.
 * Consumers remain responsible for their own transpilation and browser support.
 */
export function createLegacyRedirectHook(litePrefix = '/lite') {
  const prefixSegments = litePrefix.split('/').filter(Boolean);
  const normalizedPrefix = prefixSegments.length > 0 ? `/${prefixSegments.join('/')}` : '/';

  return async ({ event, resolve }: { event: RequestEvent; resolve: (event: RequestEvent) => Promise<Response> }) => {
    const ua = event.request.headers.get('user-agent') ?? '';
    const acceptsHtml = event.request.headers.get('accept')?.includes('text/html') === true;
    const isDocumentRequest = (event.request.method === 'GET' || event.request.method === 'HEAD')
      && acceptsHtml;
    const isWithinLite = normalizedPrefix === '/'
      || event.url.pathname === normalizedPrefix
      || event.url.pathname.startsWith(`${normalizedPrefix}/`);
    if (isLegacyBrowser(ua) && isDocumentRequest && !isWithinLite) {
      const targetPath = normalizedPrefix === '/'
        ? event.url.pathname
        : `${normalizedPrefix}${event.url.pathname}`;
      return new Response(null, {
        status: 302,
        headers: { Location: `${targetPath}${event.url.search}` },
      });
    }
    return resolve(event);
  };
}

// ─── Utilities ────────────────────────────────────────────────

function readRecordId(submittedId: FormDataEntryValue | null): string | undefined {
  if (typeof submittedId !== 'string' || submittedId.trim().length === 0) return undefined;
  return submittedId.trim();
}

function containsControlCharacter(untrustedRedirect: string): boolean {
  return Array.from(untrustedRedirect).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
  });
}

function toSafeLocalRedirect(submittedRedirect: FormDataEntryValue | null | undefined): string | undefined {
  if (typeof submittedRedirect !== 'string'
    || !submittedRedirect.startsWith('/')
    || submittedRedirect.startsWith('//')) {
    return undefined;
  }
  if (submittedRedirect.includes('\\') || containsControlCharacter(submittedRedirect)) {
    return undefined;
  }

  const base = new URL('https://svadmin.local');
  try {
    const target = new URL(submittedRedirect, base);
    if (target.origin !== base.origin) return undefined;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    // Malformed untrusted redirect input is intentionally treated as no redirect.
    return undefined;
  }
}

interface ValidationIssue {
  path: readonly PropertyKey[];
  message: string;
}

function formatValidationErrors(issues: readonly ValidationIssue[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const root = issue.path[0];
    const field = typeof root === 'string' || typeof root === 'number' ? String(root) : '_form';
    const messages = errors[field] ?? [];
    if (!messages.includes(issue.message)) messages.push(issue.message);
    errors[field] = messages;
  }

  return errors;
}

function validateFormVariables(
  resource: ResourceDefinition,
  mode: 'create' | 'edit',
  values: Record<string, unknown>,
):
  | { success: true; data: Record<string, unknown> }
  | {
      success: false;
      failure: {
        success: false;
        error: string;
        values: Record<string, unknown>;
        errors: Record<string, string[]>;
      };
    } {
  const result = resourceToTypeBoxSchema(resource, mode).safeParse(values);
  if (result.success) return { success: true, data: result.data };

  return {
    success: false,
    failure: {
      success: false,
      error: 'Validation failed',
      values: formValuesForResponse(resource.fields, values),
      errors: formatValidationErrors(result.error.issues),
    },
  };
}

function isNativeFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function formValuesForResponse(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const responseValues: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === 'password' || !(field.key in values)) continue;
    const value = values[field.key];

    if (field.type === 'array' && Array.isArray(value)) {
      responseValues[field.key] = value.map((row) => {
        if (typeof row !== 'object' || row === null || Array.isArray(row)) return row;
        return formValuesForResponse(
          field.subFields ?? [],
          row as Record<string, unknown>,
        );
      });
      continue;
    }
    if (isNativeFile(value)) continue;
    responseValues[field.key] = Array.isArray(value)
      ? value.filter((entry) => !isNativeFile(entry))
      : value;
  }

  return responseValues;
}

function isNonEmptyNativeFile(value: unknown): value is File {
  return isNativeFile(value) && value.size > 0 && value.name !== '';
}

function formDataToObject(
  formData: FormData,
  fields: FieldDefinition[],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.showInForm === false) continue;

    if (field.type === 'array') {
      obj[field.key] = parseArrayField(formData, field);
      continue;
    }

    if (field.type === 'multiselect') {
      const values = formData.getAll(field.key);
      if (values.length > 0) {
        obj[field.key] = values.map(v => String(v));
      }
      continue;
    }

    if (field.type === 'images') {
      const values = formData
        .getAll(field.key)
        .filter((value) => !isNativeFile(value) || isNonEmptyNativeFile(value));
      if (values.length > 0) obj[field.key] = values;
      continue;
    }

    const raw = formData.get(field.key);
    if (raw === null) {
      if (field.type === 'boolean') obj[field.key] = false;
      continue;
    }

    // Don't coerce File objects, but ignore empty native file inputs
    if (isNativeFile(raw)) {
      if (isNonEmptyNativeFile(raw)) {
         obj[field.key] = raw;
      }
      continue;
    }

    const strRaw = String(raw);

    switch (field.type) {
      case 'number':
        if (strRaw.trim() !== '') {
          const numberValue = Number(strRaw);
          obj[field.key] = Number.isNaN(numberValue) ? strRaw : numberValue;
        }
        break;
      case 'boolean':
        obj[field.key] = parseExplicitBoolean(strRaw) ?? strRaw;
        break;
      case 'tags':
        obj[field.key] = strRaw ? strRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        break;
      case 'json':
        try {
          obj[field.key] = strRaw ? JSON.parse(strRaw) : null;
        } catch {
          obj[field.key] = strRaw; // Let TypeBox handle validation errors
        }
        break;
      default:
        obj[field.key] = strRaw;
    }
  }
  return obj;
}

function parseArrayField(
  formData: FormData,
  field: FieldDefinition,
): Record<string, unknown>[] {
  const escapedKey = field.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entryPattern = new RegExp(`^${escapedKey}\\[(\\d+)\\]\\[([^\\]]+)\\]$`);
  const rows = new Map<number, Map<string, FormDataEntryValue[]>>();

  for (const [name, value] of formData.entries()) {
    const match = entryPattern.exec(name);
    if (!match) continue;
    const index = Number(match[1]);
    const key = match[2];
    if (!Number.isSafeInteger(index) || index < 0 || !key) continue;
    const row = rows.get(index) ?? new Map<string, FormDataEntryValue[]>();
    const values = row.get(key) ?? [];
    values.push(value);
    row.set(key, values);
    rows.set(index, row);
  }

  const result: Record<string, unknown>[] = [];
  for (const [, entries] of [...rows.entries()].sort(([a], [b]) => a - b)) {
    if (isChecked(entries.get('_delete'))) continue;

    const item: Record<string, unknown> = {};
    let hasMeaningfulValue = false;
    for (const subField of field.subFields ?? []) {
      const rawValues = entries.get(subField.key) ?? [];
      if (subField.type === 'boolean') {
        const rawValue = rawValues.at(-1);
        const value = rawValue === undefined
          ? false
          : parseExplicitBoolean(rawValue) ?? rawValue;
        item[subField.key] = value;
        hasMeaningfulValue ||= value !== false;
        continue;
      }
      if (rawValues.length === 0) continue;
      const value = coerceFieldValues(subField, rawValues);
      if (value === undefined) continue;
      item[subField.key] = value;
      hasMeaningfulValue ||= isMeaningfulValue(value);
    }

    if (hasMeaningfulValue) result.push(item);
  }
  return result;
}

function isChecked(values: FormDataEntryValue[] | undefined): boolean {
  return (values ?? []).some((value) => {
    if (typeof value !== 'string') return false;
    return value === 'on' || value === 'true' || value === '1';
  });
}

function isMeaningfulValue(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isNativeFile(value)) return isNonEmptyNativeFile(value);
  return true;
}

function coerceFieldValues(
  field: FieldDefinition,
  rawValues: FormDataEntryValue[],
): unknown {
  if (field.type === 'multiselect') {
    return rawValues.filter((value): value is string => typeof value === 'string');
  }
  if (field.type === 'images') {
    const uploadedFiles = rawValues.filter(isNonEmptyNativeFile);
    if (uploadedFiles.length > 0) return uploadedFiles;

    const retainedReferences = rawValues.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    return retainedReferences.length > 0 ? retainedReferences : undefined;
  }
  if (field.type === 'file' || field.type === 'image') {
    for (let index = rawValues.length - 1; index >= 0; index -= 1) {
      const value = rawValues[index];
      if (isNonEmptyNativeFile(value)) return value;
    }

    for (let index = rawValues.length - 1; index >= 0; index -= 1) {
      const value = rawValues[index];
      if (typeof value === 'string' && value.trim().length > 0) return value;
    }
    return undefined;
  }

  const raw = rawValues.at(-1);
  if (raw === undefined) return undefined;
  if (isNativeFile(raw)) {
    return isNonEmptyNativeFile(raw) ? raw : undefined;
  }

  switch (field.type) {
    case 'number':
      if (raw.trim() === '') return undefined;
      return Number.isNaN(Number(raw)) ? raw : Number(raw);
    case 'boolean':
      return parseExplicitBoolean(raw) ?? raw;
    case 'tags':
      return raw ? raw.split(',').map((value) => value.trim()).filter(Boolean) : [];
    case 'json':
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return raw;
      }
    default:
      return raw;
  }
}
