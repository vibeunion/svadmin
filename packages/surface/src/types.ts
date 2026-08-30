import type { DataProvider } from '@svadmin/core';
import type { TSchema } from '@sinclair/typebox';

export const SURFACE_SCHEMA_VERSION = 'surface/v1' as const;

export const SURFACE_LIMITS = {
  maxDataSources: 8,
  maxWidgets: 24,
  maxPageSize: 100,
  maxFilters: 8,
  maxSorters: 3,
  maxIdLength: 64,
  maxTitleLength: 120,
  maxJsonDepth: 64,
  maxJsonNodes: 10_000,
} as const;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type SurfaceGridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface SurfaceGridLayout {
  readonly type: 'grid';
  readonly columns: 12;
  readonly gap?: 'sm' | 'md' | 'lg';
}

export interface SurfaceSort {
  readonly field: string;
  readonly order: 'asc' | 'desc';
}

export type SurfaceFilter =
  | {
      readonly field: string;
      readonly operator: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains' | 'startswith' | 'endswith';
      readonly value: JsonPrimitive;
    }
  | {
      readonly field: string;
      readonly operator: 'in' | 'nin';
      readonly value: readonly JsonPrimitive[];
    }
  | {
      readonly field: string;
      readonly operator: 'null' | 'nnull';
    };

export interface ResourceListSource {
  readonly id: string;
  readonly type: 'resource-list';
  readonly resource: string;
  readonly pageSize?: number;
  readonly sorters?: readonly SurfaceSort[];
  readonly filters?: readonly SurfaceFilter[];
}

export interface ResourceOneSource {
  readonly id: string;
  readonly type: 'resource-one';
  readonly resource: string;
  readonly recordId: string | number;
}

export type ResourceListDataSource = ResourceListSource;
export type ResourceOneDataSource = ResourceOneSource;
export type SurfaceDataSource = ResourceListSource | ResourceOneSource;

export interface SurfaceBinding {
  readonly sourceId: string;
  readonly pointer?: string;
}

export interface SurfaceWidget {
  readonly id: string;
  readonly type: string;
  readonly props: JsonObject;
  readonly binding?: SurfaceBinding;
  readonly placement?: { readonly columnSpan?: SurfaceGridSpan };
}

export interface SurfaceSpec {
  readonly schemaVersion: typeof SURFACE_SCHEMA_VERSION;
  readonly catalogVersion: string;
  readonly surfaceId: string;
  readonly title: string;
  readonly layout: SurfaceGridLayout;
  readonly dataSources: readonly SurfaceDataSource[];
  readonly widgets: readonly SurfaceWidget[];
}

export interface SurfaceResourcePolicy {
  readonly readFields: readonly string[];
  readonly filterFields?: readonly string[];
  readonly sortFields?: readonly string[];
  readonly allowGetOne?: boolean;
  readonly maxPageSize?: number;
}

export interface SurfacePolicy {
  readonly resources: Readonly<Record<string, SurfaceResourcePolicy>>;
}

export type SurfaceCatalogDataKind = 'none' | 'scalar' | 'items';

export interface SurfaceWidgetDefinition {
  readonly type: string;
  readonly dataKind: SurfaceCatalogDataKind;
  readonly propsSchema: TSchema;
  /** 组件从绑定记录中读取的字段，由可信 Catalog 提供。 */
  readonly getReferencedFields?: (props: JsonObject) => readonly string[];
}

export interface SurfaceCatalog {
  readonly version: string;
  readonly widgets: readonly SurfaceWidgetDefinition[];
}

export type SurfaceValidationCode =
  | 'invalid_json'
  | 'unsupported_schema_version'
  | 'catalog_version_mismatch'
  | 'duplicate_id'
  | 'unknown_widget_type'
  | 'unknown_data_source'
  | 'invalid_binding_pointer'
  | 'invalid_widget_props'
  | 'resource_denied'
  | 'field_denied'
  | 'limit_exceeded';

export interface SurfaceValidationIssue {
  readonly code: SurfaceValidationCode;
  readonly path: string;
  readonly message: string;
  readonly widgetId?: string;
  readonly sourceId?: string;
}

export type SurfaceValidationResult =
  | { readonly ok: true; readonly value: SurfaceSpec }
  | { readonly ok: false; readonly issues: readonly SurfaceValidationIssue[] };

export type SurfaceDataProvider = Pick<DataProvider, 'getList' | 'getOne'>;

export interface SurfaceDataError {
  readonly code:
    | 'access_denied'
    | 'access_check_failed'
    | 'provider_failed'
    | 'provider_result_not_json'
    | 'binding_pointer_not_found';
  readonly sourceId: string;
  readonly message: string;
}

export type SurfaceWidgetDataState =
  | { readonly status: 'unbound' }
  | { readonly status: 'loading'; readonly sourceId: string }
  | { readonly status: 'empty'; readonly sourceId: string }
  | { readonly status: 'ready'; readonly sourceId: string; readonly value: JsonValue }
  | { readonly status: 'error'; readonly sourceId: string; readonly error: SurfaceDataError };

export type SurfaceSourceDataState = Extract<
  SurfaceWidgetDataState,
  { status: 'loading' | 'ready' | 'error' }
>;
