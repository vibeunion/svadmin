import { allRecipes, describeRecipe } from "./recipes.js";
import { surfaceDesignContract } from "./design-contract.js";

export type ComponentPropKind = "string" | "string[]" | "boolean" | "enum" | "number" | "string | number";

export interface ComponentPropMetadata {
  kind: ComponentPropKind;
  required?: boolean;
  values?: readonly string[];
  default?: string | boolean | number;
  description?: string;
}

export interface ComponentSlotMetadata {
  kind: "snippet";
  required?: boolean;
  description?: string;
}

export interface ComponentRegistryEntry {
  id: string;
  component: string;
  recipe: keyof typeof import("./recipes.js").allRecipes;
  props: Record<string, ComponentPropMetadata>;
  slots: Record<string, ComponentSlotMetadata>;
  tokens: readonly string[];
  states: readonly string[];
  nativeProps?: string;
}

// 组件主题入口；不是允许模型写入 CSS 的白名单。
const semanticTokens = ["foreground", "muted-foreground", "border"] as const;

function variant(recipe: keyof typeof allRecipes, name: string): ComponentPropMetadata {
  const metadata = describeRecipe(recipe);
  const value = metadata.defaults as Record<string, string | boolean>;
  return {
    kind: "enum",
    values: metadata.variants[name] ?? [],
    ...(value[name] !== undefined ? { default: value[name] } : {}),
  };
}

const registryEntries = [
  {
    id: "content-page-shell",
    component: "@svadmin/ui/components/content/ContentPageShell.svelte",
    recipe: "contentPageRecipe",
    props: {
      title: { kind: "string" },
      eyebrow: { kind: "string" },
      description: { kind: "string" },
      pageId: { kind: "string" },
      width: variant("contentPageRecipe", "width"),
      density: variant("contentPageRecipe", "density"),
      class: { kind: "string" },
    },
    slots: { children: { kind: "snippet", required: true }, actions: { kind: "snippet" } },
    tokens: semanticTokens,
    states: ["default"],
  },
  {
    id: "content-page-header",
    component: "@svadmin/ui/components/content/ContentPageHeader.svelte",
    recipe: "contentHeaderRecipe",
    props: {
      title: { kind: "string", required: true },
      eyebrow: { kind: "string" },
      description: { kind: "string" },
      breadcrumbs: { kind: "string[]" },
      density: variant("contentHeaderRecipe", "density"),
      class: { kind: "string" },
    },
    slots: { actions: { kind: "snippet" } },
    tokens: semanticTokens,
    states: ["default"],
  },
  {
    id: "metric-block",
    component: "@svadmin/ui/components/content/MetricBlock.svelte",
    recipe: "metricBlockRecipe",
    props: {
      label: { kind: "string", required: true },
      value: { kind: "string | number", required: true },
      detail: { kind: "string" },
      trend: { kind: "string" },
      trendTone: variant("metricBlockRecipe", "trendTone"),
      loading: { kind: "boolean", default: false },
      class: { kind: "string" },
    },
    slots: { icon: { kind: "snippet" } },
    tokens: [...semanticTokens, "card", "success", "destructive", "warning-foreground"],
    states: ["default", "loading"],
  },
  {
    id: "settings-field-row",
    component: "@svadmin/ui/components/content/SettingsFieldRow.svelte",
    recipe: "productSettingsRowRecipe",
    props: {
      label: { kind: "string", required: true },
      description: { kind: "string" },
      separated: { kind: "boolean", default: false },
      class: { kind: "string" },
    },
    slots: { control: { kind: "snippet", required: true } },
    tokens: semanticTokens,
    states: ["default", "separated"],
  },
  {
    id: "settings-group",
    component: "@svadmin/ui/components/content/SettingsGroup.svelte",
    recipe: "productSettingsRecipe",
    props: {
      title: { kind: "string", required: true },
      description: { kind: "string" },
      class: { kind: "string" },
      bodyClass: { kind: "string" },
    },
    slots: {
      children: { kind: "snippet", required: true },
      actions: { kind: "snippet" },
    },
    tokens: semanticTokens,
    states: ["default"],
  },
  {
    id: "workspace-layout",
    component: "@svadmin/ui/components/content/WorkspaceLayout.svelte",
    recipe: "productWorkspaceRecipe",
    props: {
      secondaryWidth: { kind: "string", default: "22rem" },
      secondaryCollapsed: { kind: "boolean", default: false },
      secondaryCollapsedWidth: { kind: "string", default: "3rem" },
      mobileOrder: { kind: "enum", values: ["primary-first", "secondary-first"], default: "primary-first" },
      class: { kind: "string" },
    },
    slots: {
      primary: { kind: "snippet", required: true },
      summary: { kind: "snippet" },
      secondary: { kind: "snippet" },
    },
    tokens: semanticTokens,
    states: ["default", "secondary-collapsed"],
  },
  {
    id: "button",
    component: "@svadmin/ui/components/ui/button/button.svelte",
    recipe: "buttonRecipe",
    props: {
      variant: variant("buttonRecipe", "variant"),
      size: variant("buttonRecipe", "size"),
      disabled: { kind: "boolean", default: false },
      disabledReason: { kind: "string" },
    },
    slots: { children: { kind: "snippet" } },
    tokens: semanticTokens,
    states: ["default", "disabled", "focus-visible"],
    nativeProps: "HTMLButtonAttributes | HTMLAnchorAttributes; WithElementRef",
  },
  {
    id: "badge",
    component: "@svadmin/ui/components/ui/badge/badge.svelte",
    recipe: "badgeRecipe",
    props: {
      variant: variant("badgeRecipe", "variant"),
      size: { kind: "enum", values: ["default", "compact"], default: "default" },
    },
    slots: { children: { kind: "snippet" } },
    tokens: semanticTokens,
    states: ["default"],
    nativeProps: "HTMLAnchorAttributes; WithElementRef",
  },
  {
    id: "textarea",
    component: "@svadmin/ui/components/ui/textarea/textarea.svelte",
    recipe: "textareaRecipe",
    props: {},
    slots: {},
    tokens: semanticTokens,
    states: ["default", "disabled", "focus-visible", "aria-invalid"],
    nativeProps: "HTMLTextareaAttributes; WithElementRef; bind:value",
  },
  {
    id: "section-header",
    component: "@svadmin/ui/components/content/SectionHeader.svelte",
    recipe: "productSectionRecipe",
    props: {
      title: { kind: "string", required: true },
      description: { kind: "string" },
      id: { kind: "string" },
      class: { kind: "string" },
    },
    slots: { actions: { kind: "snippet" } },
    tokens: semanticTokens,
    states: ["default"],
  },
  {
    id: "page-toolbar",
    component: "@svadmin/ui/components/content/PageToolbar.svelte",
    recipe: "productToolbarRecipe",
    props: { class: { kind: "string" } },
    slots: {
      leading: { kind: "snippet" },
      trailing: { kind: "snippet" },
      children: { kind: "snippet" },
    },
    tokens: semanticTokens,
    states: ["default"],
  },
  {
    id: "status-badge",
    component: "@svadmin/ui/components/content/StatusBadge.svelte",
    recipe: "productStatusRecipe",
    props: {
      status: { kind: "enum", values: describeRecipe("productStatusRecipe").variants["status"] ?? [], required: true },
      label: { kind: "string", description: "Defaults to status" },
      class: { kind: "string" },
    },
    slots: {},
    tokens: [...semanticTokens, "success", "warning", "destructive", "info"],
    states: ["default"],
  },
] satisfies readonly ComponentRegistryEntry[];

export const componentRegistry = registryEntries.map((entry) => ({
  ...entry,
  recipeMetadata: describeRecipe(entry.recipe),
  tokens: [...entry.tokens],
  states: [...entry.states],
}));

export function getComponentRegistry() {
  return componentRegistry.map((entry) => ({
    ...entry,
    props: { ...entry.props },
    slots: { ...entry.slots },
  }));
}

export function createComponentRegistryManifest() {
  return {
    version: "svadmin/component-registry-v1",
    purpose: "authoring-only",
    coverage: "twelve-ui-components-and-fourteen-recipes",
    runtimeCatalog: "@svadmin/surface: createSurfaceCatalogManifest",
    designContract: surfaceDesignContract,
    recipes: Object.fromEntries((Object.keys(allRecipes) as Array<keyof typeof allRecipes>)
      .map(name => [name, describeRecipe(name)])),
    components: getComponentRegistry(),
  };
}
