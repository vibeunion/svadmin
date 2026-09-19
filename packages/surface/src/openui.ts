import { SURFACE_AGENT_LIMITS, createSurfaceCatalogManifest } from './agent-contract.js';
import { validateSurfaceSpec } from './validation.js';
import { isJsonValue } from './json.js';
import type { JsonObject, SurfaceCatalog, SurfacePolicy, SurfaceSpec, SurfaceWidget, SurfaceDataSource } from './types.js';
import { createOpenUIStatementGuard, SurfaceOpenUIError, OPENUI_LIMITS } from './workflows/openui-guard.js';

export { SurfaceOpenUIError, OPENUI_LIMITS };

/** Structural subset of @openuidev/lang-core's public types. The actual parser
 * factory is injected by the trusted host, avoiding a React/Zod/runtime dependency
 * in the existing Surface root entry. Tested integration must use the real factory.
 */
export interface SurfaceOpenUILibrarySchema {
  $defs: Record<string, { properties: Record<string, unknown>; required: string[] }>;
}
export interface SurfaceOpenUIElement {
  type: 'element'; typeName: string; props: Record<string, unknown>; partial: boolean;
}
export interface SurfaceOpenUIParseResult {
  root: SurfaceOpenUIElement | null;
  meta: { incomplete: boolean; unresolved: string[]; orphaned: string[]; errors: readonly unknown[] };
  stateDeclarations?: Record<string, unknown>;
  queryStatements?: readonly unknown[];
  mutationStatements?: readonly unknown[];
}
export type SurfaceOpenUIParserFactory = (schema: SurfaceOpenUILibrarySchema, rootName?: string) => {
  push(chunk: string): SurfaceOpenUIParseResult;
  getResult(): SurfaceOpenUIParseResult;
};
export type SurfaceOpenUIResult =
  | { readonly ok: true; readonly complete: boolean; readonly preview: SurfaceSpec | null; readonly unresolved: readonly string[] }
  | { readonly ok: false; readonly preview: null; readonly error: { readonly code: string; readonly message: string } };

function componentNames(catalog: SurfaceCatalog): Map<string, string> {
  const names = new Map<string, string>();
  for (const widget of catalog.widgets) {
    const name = widget.type.split(/[^A-Za-z0-9]+/u).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
    if (!/^[A-Z][A-Za-z0-9]*$/u.test(name) || ['Surface', 'Source'].includes(name) || names.has(name)) {
      throw new Error(`Surface widget cannot be mapped to a unique OpenUI name: ${widget.type}`);
    }
    names.set(name, widget.type);
  }
  return names;
}

export function createSurfaceOpenUISchema(catalog: SurfaceCatalog): SurfaceOpenUILibrarySchema {
  // Validates the same host-owned catalog used by prompts and the renderer.
  createSurfaceCatalogManifest(catalog);
  const names = componentNames(catalog);
  const defs: SurfaceOpenUILibrarySchema['$defs'] = {
    Surface: { properties: {
      surfaceId: { type: 'string' }, title: { type: 'string' },
      sources: { type: 'array' }, widgets: { type: 'array' }, gap: { type: 'string' },
    }, required: ['surfaceId', 'title', 'sources', 'widgets'] },
    Source: { properties: { value: { type: 'object' } }, required: ['value'] },
  };
  for (const [name, type] of names) {
    const definition = catalog.widgets.find((widget) => widget.type === type)!;
    defs[name] = { properties: {
      id: { type: 'string' }, props: JSON.parse(JSON.stringify(definition.propsSchema)) as unknown,
      binding: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      span: { type: 'number' },
    }, required: ['id', 'props'] };
  }
  return { $defs: defs };
}

function element(value: unknown): value is SurfaceOpenUIElement {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && (value as SurfaceOpenUIElement).type === 'element'
    && typeof (value as SurfaceOpenUIElement).typeName === 'string'
    && !!(value as SurfaceOpenUIElement).props && typeof (value as SurfaceOpenUIElement).props === 'object';
}

export function createSurfaceOpenUIStream(options: {
  readonly catalog: SurfaceCatalog;
  readonly policy: SurfacePolicy;
  readonly createStreamingParser: SurfaceOpenUIParserFactory;
}) {
  const { catalog, policy } = options;
  const schema = createSurfaceOpenUISchema(catalog);
  const names = componentNames(catalog);
  const parser = options.createStreamingParser(schema, 'Surface');
  const guard = createOpenUIStatementGuard(Object.keys(schema.$defs));
  let terminal: SurfaceOpenUIResult | undefined;
  let latestPreview: SurfaceOpenUIResult = { ok: true, complete: false, preview: null, unresolved: [] };

  function normalize(final: boolean): SurfaceOpenUIResult {
    const parsed = parser.getResult();
    if ((parsed.queryStatements?.length ?? 0) || (parsed.mutationStatements?.length ?? 0)
      || Object.keys(parsed.stateDeclarations ?? {}).length) {
      throw new SurfaceOpenUIError('unsupported', 'OpenUI state, Query and Mutation execution is not allowed');
    }
    if (parsed.meta.errors.length) throw new SurfaceOpenUIError('syntax', 'OpenUI component arguments failed validation');
    if (final && (parsed.meta.incomplete || parsed.meta.unresolved.length || parsed.meta.orphaned.length)) {
      throw new SurfaceOpenUIError('syntax', 'Incomplete, unresolved or unreachable declarations remain');
    }
    if (!parsed.root) {
      if (final) throw new SurfaceOpenUIError('syntax', 'A Surface root is required');
      return { ok: true, complete: false, preview: null, unresolved: parsed.meta.unresolved };
    }
    const root = parsed.root;
    if (root.typeName !== 'Surface' || root.partial) throw new SurfaceOpenUIError('syntax', 'Expected a complete Surface declaration');
    const { surfaceId, title, sources, widgets, gap } = root.props;
    if (!Array.isArray(sources) || !Array.isArray(widgets)) throw new SurfaceOpenUIError('syntax', 'Surface sources and widgets must be arrays');
    const dataSources: SurfaceDataSource[] = [];
    for (const source of sources) {
      if (source === null && !final) continue;
      if (!element(source) || source.typeName !== 'Source' || source.partial || !isJsonValue(source.props.value)) {
        throw new SurfaceOpenUIError('syntax', 'Invalid Source node');
      }
      dataSources.push(source.props.value as unknown as SurfaceDataSource);
    }
    const normalized: SurfaceWidget[] = [];
    for (const widget of widgets) {
      if (widget === null && !final) continue;
      if (!element(widget) || widget.partial || !names.has(widget.typeName)) throw new SurfaceOpenUIError('syntax', 'Unregistered widget node');
      const { id, props, binding, span } = widget.props;
      if (!isJsonValue(props)) throw new SurfaceOpenUIError('syntax', 'Widget props must be literal JSON');
      // A forward reference is never replaced with invented data or defaults.
      // Exclude widgets depending on unresolved sources from structural previews.
      if (!final && binding && typeof binding === 'object'
        && !dataSources.some((source) => source.id === (binding as { sourceId?: unknown }).sourceId)) continue;
      normalized.push({ id, type: names.get(widget.typeName), props,
        ...(binding == null ? {} : { binding }),
        ...(span == null ? {} : { placement: { columnSpan: span } }),
      } as SurfaceWidget);
    }
    const candidate = { schemaVersion: 'surface/v1', catalogVersion: catalog.version,
      surfaceId, title, layout: { type: 'grid', columns: 12, ...(gap == null ? {} : { gap }) }, dataSources, widgets: normalized };
    const result = validateSurfaceSpec(candidate, catalog, policy);
    if (!result.ok) throw new SurfaceOpenUIError('invalid_surface', result.issues.map((issue) => `${issue.code}:${issue.path}`).join(', '));
    return { ok: true, complete: final, preview: result.value, unresolved: [...parsed.meta.unresolved] };
  }
  function fail(error: unknown): SurfaceOpenUIResult {
    terminal = { ok: false, preview: null, error: {
      code: error instanceof SurfaceOpenUIError ? error.code : 'syntax',
      message: error instanceof SurfaceOpenUIError ? error.message : 'OpenUI parser failed',
    } };
    return terminal;
  }
  return {
    push(chunk: string): SurfaceOpenUIResult {
      if (terminal) return { ok: false, preview: null, error: { code: 'closed', message: 'Stream is closed' } };
      try {
        const statements = guard.push(chunk);
        // Token-by-token transport must not repeatedly materialize an unchanged tree.
        if (!statements.length) return latestPreview;
        for (const statement of statements) parser.push(statement);
        latestPreview = normalize(false);
        return latestPreview;
      } catch (error) { return fail(error); }
    },
    finish(): SurfaceOpenUIResult {
      if (terminal) return terminal;
      try {
        for (const statement of guard.finish()) parser.push(statement);
        terminal = normalize(true);
        return terminal;
      } catch (error) { return fail(error); }
    },
  };
}

export function buildSurfaceOpenUIMessages(request: string, catalog: SurfaceCatalog, policy: SurfacePolicy) {
  if (typeof request !== 'string' || !request.trim() || request.length > 8000) throw new Error('Invalid Surface request');
  const schema = createSurfaceOpenUISchema(catalog);
  const content = [
    'Return only static OpenUI Lang declarations. Use root = Surface(surfaceId, title, sources, widgets, gap).',
    'Use Source(resourceSourceJSON). Each catalog component uses (id, props, bindingOrNull, columnSpan).',
    'Use named component declarations, never inline calls or reusable literal declarations. Forward references are allowed only once in the Surface root. Use quoted JSON object keys and double-quoted strings.',
    'Never emit Markdown, expressions, state, Query, Mutation, Action, arbitrary code, CSS, URLs or tool calls.',
    'Form field schemas and submission labels belong to registered host actions, not model output. Never claim a write has executed.',
    `Library: ${JSON.stringify(schema)}`,
    `Catalog: ${JSON.stringify(createSurfaceCatalogManifest(catalog))}`,
    `Resource policy: ${JSON.stringify(policy)}`,
  ].join('\n');
  if (content.length > SURFACE_AGENT_LIMITS.maxContractCharacters) throw new Error('Select a smaller Surface catalog');
  return [{ role: 'system' as const, content }, { role: 'user' as const, content: request }];
}
