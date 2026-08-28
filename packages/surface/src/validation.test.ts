import { describe, expect, test } from "vitest";
import { Type } from "@sinclair/typebox";
import type { SurfaceCatalog, SurfacePolicy } from "./types.js";
import { validateSurfaceSpec } from "./validation.js";

const catalog = {
  version: "test/v1",
  widgets: [
    {
      type: "metric",
      dataKind: "scalar",
      propsSchema: Type.Object({
        label: Type.String({ minLength: 1 }),
        format: Type.Union([
          Type.Literal("number"),
          Type.Literal("currency"),
          Type.Literal("percent"),
        ]),
      }, { additionalProperties: false }),
    },
  ],
} satisfies SurfaceCatalog;

const policy = {
  resources: {
    products: {
      readFields: ["id", "name", "stock"],
      sortFields: ["stock"],
      maxPageSize: 25,
    },
  },
} satisfies SurfacePolicy;

describe("validateSurfaceSpec", () => {
  test("accepts a valid read-only surface contract", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "inventory-overview",
      title: "Inventory overview",
      layout: { type: "grid", columns: 12, gap: "md" },
      dataSources: [
        {
          id: "products",
          type: "resource-list",
          resource: "products",
          pageSize: 10,
          sorters: [{ field: "stock", order: "asc" }],
        },
      ],
      widgets: [
        {
          id: "product-count",
          type: "metric",
          props: { label: "Products", format: "number" },
          binding: { sourceId: "products", pointer: "/total" },
          placement: { columnSpan: 3 },
        },
      ],
    }, catalog, policy);

    expect(validation).toEqual(expect.objectContaining({
      ok: true,
      value: expect.objectContaining({ surfaceId: "inventory-overview" }),
    }));
  });

  test("rejects a resource-one binding outside the readable field policy", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "product-detail",
      title: "Product detail",
      layout: { type: "grid", columns: 12 },
      dataSources: [
        {
          id: "product",
          type: "resource-one",
          resource: "products",
          recordId: 1,
        },
      ],
      widgets: [
        {
          id: "secret-value",
          type: "metric",
          props: { label: "Secret", format: "number" },
          binding: { sourceId: "product", pointer: "/secret" },
        },
      ],
    }, catalog, {
      resources: {
        products: {
          readFields: ["id", "name"],
          allowGetOne: true,
        },
      },
    });

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({
        code: "field_denied",
        path: "/widgets/0/binding/pointer",
      })],
    });
  });

  test("rejects forbidden presentation properties nested inside arrays", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "custom/v1",
      surfaceId: "unsafe-presentation",
      title: "Unsafe presentation",
      layout: { type: "grid", columns: 12 },
      dataSources: [],
      widgets: [
        {
          id: "custom-widget",
          type: "custom",
          props: { columns: [{ label: "Name", style: "display:none" }] },
        },
      ],
    }, {
      version: "custom/v1",
      widgets: [{
        type: "custom",
        dataKind: "none",
        propsSchema: Type.Record(Type.String(), Type.Unknown()),
      }],
    }, { resources: {} });

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "invalid_widget_props" })],
    });
  });

  test("rejects catalog-declared widget fields outside the readable policy", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "table/v1",
      surfaceId: "unsafe-table",
      title: "Unsafe table",
      layout: { type: "grid", columns: 12 },
      dataSources: [{ id: "products", type: "resource-list", resource: "products" }],
      widgets: [{
        id: "products-table",
        type: "resource-table",
        props: { columns: [{ field: "supplierSecret", label: "Supplier secret" }] },
        binding: { sourceId: "products", pointer: "/items" },
      }],
    }, {
      version: "table/v1",
      widgets: [{
        type: "resource-table",
        dataKind: "items",
        propsSchema: Type.Object({
          columns: Type.Array(Type.Object({ field: Type.String(), label: Type.String() }, { additionalProperties: false })),
        }, { additionalProperties: false }),
        getReferencedFields: (props) => (
          props.columns as Array<{ field: string }>
        ).map((column) => column.field),
      }],
    }, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({
        code: "field_denied",
        path: "/widgets/0/props",
      })],
    });
  });

  test.each([
    ["unsupported schema versions", { schemaVersion: "surface/v2" }, "unsupported_schema_version"],
    ["catalog version mismatches", { catalogVersion: "other/v1" }, "catalog_version_mismatch"],
  ])("rejects %s", (_label, overrides, expectedCode) => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "version-check",
      title: "Version check",
      layout: { type: "grid", columns: 12 },
      dataSources: [],
      widgets: [],
      ...overrides,
    }, catalog, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: expectedCode })],
    });
  });

  test("rejects duplicate IDs across sources and widgets", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "duplicates",
      title: "Duplicates",
      layout: { type: "grid", columns: 12 },
      dataSources: [{ id: "shared", type: "resource-list", resource: "products" }],
      widgets: [{
        id: "shared",
        type: "metric",
        props: { label: "Products", format: "number" },
        binding: { sourceId: "shared", pointer: "/total" },
      }],
    }, catalog, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "duplicate_id", path: "/widgets/0/id" })],
    });
  });

  test.each([
    [
      "an unknown widget type",
      { id: "unknown-widget", type: "unknown", props: {} },
      "unknown_widget_type",
    ],
    [
      "an unknown data source",
      {
        id: "unknown-source",
        type: "metric",
        props: { label: "Products", format: "number" },
        binding: { sourceId: "missing", pointer: "/total" },
      },
      "unknown_data_source",
    ],
  ])("rejects %s", (_label, widget, expectedCode) => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "catalog-check",
      title: "Catalog check",
      layout: { type: "grid", columns: 12 },
      dataSources: [],
      widgets: [widget],
    }, catalog, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: expectedCode })],
    });
  });

  test("rejects dangerous or incompatible JSON pointers", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "pointer-check",
      title: "Pointer check",
      layout: { type: "grid", columns: 12 },
      dataSources: [{ id: "products", type: "resource-list", resource: "products" }],
      widgets: [{
        id: "unsafe-pointer",
        type: "metric",
        props: { label: "Products", format: "number" },
        binding: { sourceId: "products", pointer: "/__proto__" },
      }],
    }, catalog, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "invalid_binding_pointer" })],
    });
  });

  test("accepts an RFC 6901 encoded readable field pointer", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "encoded-pointer",
      title: "Encoded pointer",
      layout: { type: "grid", columns: 12 },
      dataSources: [{
        id: "summary",
        type: "resource-one",
        resource: "summary",
        recordId: "current",
      }],
      widgets: [{
        id: "revenue",
        type: "metric",
        props: { label: "Revenue", format: "number" },
        binding: { sourceId: "summary", pointer: "/revenue~1total" },
      }],
    }, catalog, {
      resources: {
        summary: {
          readFields: ["revenue/total"],
          allowGetOne: true,
        },
      },
    });

    expect(validation).toEqual(expect.objectContaining({ ok: true }));
  });

  test("rejects non-JSON values before catalog validation", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "json-check",
      title: "JSON check",
      layout: { type: "grid", columns: 12 },
      dataSources: [],
      widgets: [{
        id: "bad-json",
        type: "metric",
        props: { label: "Products", format: "number", value: Number.NaN },
      }],
    }, catalog, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "invalid_json", path: "/widgets/0/props/value" })],
    });
  });

  test("enforces global source and widget limits", () => {
    const dataSources = Array.from({ length: 9 }, (_, index) => ({
      id: `source-${index}`,
      type: "resource-list",
      resource: "products",
    }));
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "limit-check",
      title: "Limit check",
      layout: { type: "grid", columns: 12 },
      dataSources,
      widgets: [],
    }, catalog, policy);

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "limit_exceeded" })],
    });
  });

  test("rejects catalog schemas that silently strip unknown props", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "loose/v1",
      surfaceId: "loose-catalog",
      title: "Loose catalog",
      layout: { type: "grid", columns: 12 },
      dataSources: [],
      widgets: [{ id: "loose", type: "loose", props: { label: "Loose" } }],
    }, {
      version: "loose/v1",
      widgets: [{
        type: "loose",
        dataKind: "none",
        propsSchema: Type.Object({ label: Type.String() }),
      }],
    }, { resources: {} });

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({
        code: "invalid_widget_props",
        path: "/widgets/0/props",
      })],
    });
  });

  test("does not authorize resources inherited from Object.prototype", () => {
    const validation = validateSurfaceSpec({
      schemaVersion: "surface/v1",
      catalogVersion: "test/v1",
      surfaceId: "prototype-resource",
      title: "Prototype resource",
      layout: { type: "grid", columns: 12 },
      dataSources: [{ id: "prototype-source", type: "resource-list", resource: "constructor" }],
      widgets: [],
    }, catalog, { resources: {} });

    expect(validation).toEqual({
      ok: false,
      issues: [expect.objectContaining({
        code: "resource_denied",
        path: "/dataSources/0/resource",
      })],
    });
  });
});
