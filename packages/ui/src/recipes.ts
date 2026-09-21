import { tv } from "tailwind-variants";

function resolveSlots<T extends Record<string, () => string>>(slots: T): { [K in Exclude<keyof T, "base">]: string } {
  // tv 的 synthetic base 不是组件 anatomy；公开 API 仅返回实际 slot 字符串。
  return Object.fromEntries(Object.entries(slots).filter(([key]) => key !== "base")
    .map(([key, value]) => [key, value()])) as { [K in Exclude<keyof T, "base">]: string };
}

const semantic = {
  page: "mx-auto w-full",
  muted: "text-muted-foreground",
  body: "text-foreground text-sm leading-6",
  group: "flex min-w-0 flex-wrap items-center gap-2",
};

const buttonRecipeStyles = tv({
  base: "svadmin-button",
  variants: {
    variant: {
      default: "svadmin-button--default",
      outline: "svadmin-button--outline",
      secondary: "svadmin-button--secondary",
      ghost: "svadmin-button--ghost",
      destructive: "svadmin-button--destructive",
      link: "svadmin-button--link",
    },
    size: {
      default: "svadmin-button-size--default",
      xs: "svadmin-button-size--xs",
      sm: "svadmin-button-size--sm",
      lg: "svadmin-button-size--lg",
      icon: "svadmin-button-size--icon",
      "icon-xs": "svadmin-button-size--icon-xs",
      "icon-sm": "svadmin-button-size--icon-sm",
      "icon-lg": "svadmin-button-size--icon-lg",
    },
  },
});

const badgeRecipeStyles = tv({
  base: "svadmin-badge",
  variants: {
    variant: {
      default: "svadmin-badge--default",
      secondary: "svadmin-badge--secondary",
      destructive: "svadmin-badge--destructive",
      subtle: "svadmin-badge--subtle",
      "subtle-success": "svadmin-badge--subtle-success",
      "subtle-warning": "svadmin-badge--subtle-warning",
      "subtle-destructive": "svadmin-badge--subtle-destructive",
      "subtle-pill": "svadmin-badge--subtle-pill",
      outline: "svadmin-badge--outline",
      ghost: "svadmin-badge--ghost",
      link: "svadmin-badge--link",
    },
  },
});

const buttonRecipeDefaults = { variant: "default", size: "default" } as const;
const badgeRecipeDefaults = { variant: "default" } as const;

type OmitVariantProps<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ButtonRecipeProps = OmitVariantProps<NonNullable<Parameters<typeof buttonRecipeStyles>[0]>, "variant" | "size"> & {
  variant?: keyof typeof buttonRecipeStyles.variants.variant | null | undefined;
  size?: keyof typeof buttonRecipeStyles.variants.size | null | undefined;
};

export type BadgeRecipeProps = OmitVariantProps<NonNullable<Parameters<typeof badgeRecipeStyles>[0]>, "variant"> & {
  variant?: keyof typeof badgeRecipeStyles.variants.variant | null | undefined;
};

const textareaRecipeStyles = tv({ base: "svadmin-textarea" });

const contentPageRecipeStyles = tv({
  slots: { root: `${semantic.page} svadmin-content-page space-y-6` },
  variants: {
    width: {
      narrow: { root: "max-w-3xl" },
      default: { root: "max-w-[74rem]" },
      wide: { root: "max-w-[92rem]" },
    },
  },
  defaultVariants: { width: "default" },
});

const contentHeaderRecipeStyles = tv({
  slots: {
    root: "svadmin-content-header space-y-3",
    breadcrumbs: `${semantic.group} text-xs text-muted-foreground`,
    currentCrumb: "text-foreground",
    row: "flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between",
    heading: "min-w-0 space-y-1",
    eyebrow: "text-xs font-medium text-muted-foreground",
    title: "text-xl font-semibold leading-tight text-foreground",
    description: "max-w-2xl text-sm leading-6 text-muted-foreground",
    actions: "flex shrink-0 flex-wrap items-center gap-2",
  },
});

const metricBlockRecipeStyles = tv({
  slots: {
    root: "svadmin-metric-block min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm",
    header: "flex items-start justify-between gap-3",
    label: "text-sm text-muted-foreground",
    icon: "text-muted-foreground",
    skeleton: "mt-3 h-8 w-24",
    value: "mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-semibold tabular-nums text-foreground",
    meta: "mt-2 flex flex-wrap gap-2 text-xs",
    trend: "font-medium tabular-nums",
    detail: "text-muted-foreground",
  },
  variants: {
    trendTone: {
      positive: { trend: "text-success" },
      negative: { trend: "text-destructive" },
      warning: { trend: "text-warning-foreground" },
      neutral: { trend: "text-muted-foreground" },
    },
  },
  defaultVariants: { trendTone: "neutral" },
});

const productSectionRecipeStyles = tv({
  slots: {
    root: "flex flex-wrap items-start justify-between gap-3",
    heading: "min-w-0 flex-[1_1_16rem]",
    title: "m-0 text-base font-semibold text-foreground [overflow-wrap:anywhere]",
    description: "mt-1 max-w-[65ch] text-[0.8125rem] leading-6 text-muted-foreground",
    actions: "flex shrink-0 flex-wrap items-center gap-2",
  },
});

const productToolbarRecipeStyles = tv({
  slots: {
    root: "flex flex-wrap items-center justify-between gap-3 border-b border-border py-3",
    leading: "flex min-w-0 flex-[1_1_16rem] flex-wrap items-center gap-2",
    trailing: "ms-auto flex min-w-0 flex-wrap items-center gap-2",
  },
});

const productWorkspaceRecipeStyles = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-6",
    summary: "min-w-0",
    columns: "grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,var(--workspace-secondary-width,22rem))]",
    primary: "min-w-0 lg:order-1",
    secondary: "flex min-w-0 flex-col gap-6 lg:order-2",
  },
  variants: { hasSecondary: { true: {}, false: { columns: "lg:grid-cols-1" } } },
  defaultVariants: { hasSecondary: false },
});

const productSettingsRecipeStyles = tv({
  slots: {
    root: `${semantic.body} min-w-0`,
    header: "flex flex-wrap items-start justify-between gap-3 border-b border-border py-4",
    heading: "min-w-0 flex-[1_1_16rem]",
    title: "m-0 text-base font-semibold text-foreground [overflow-wrap:anywhere]",
    description: "mt-1 max-w-[65ch] text-[0.8125rem] leading-6 text-muted-foreground",
    actions: "flex shrink-0 flex-wrap items-center gap-2",
    body: "min-w-0 py-1",
  },
});

const productSettingsRowRecipeStyles = tv({
  slots: {
    root: "grid min-w-0 grid-cols-1 items-start gap-3 py-5 md:grid-cols-2 md:gap-x-6",
    heading: "min-w-0",
    label: "m-0 font-medium text-foreground [overflow-wrap:anywhere]",
    description: "mt-1 max-w-[52ch] text-[0.8125rem] leading-6 text-muted-foreground [overflow-wrap:anywhere]",
    control: "min-w-0 max-w-full",
  },
  variants: { separated: { true: { root: "border-t border-border" }, false: {} } },
  defaultVariants: { separated: false },
});

const productStatusRecipeStyles = tv({
  slots: { root: "svadmin-product-status" },
  variants: {
    status: {
      success: { root: "[--svadmin-status-color:var(--success)]" },
      warning: { root: "[--svadmin-status-color:var(--warning)]" },
      danger: { root: "[--svadmin-status-color:var(--destructive)]" },
      info: { root: "[--svadmin-status-color:var(--info)]" },
      neutral: { root: "[--svadmin-status-color:var(--muted-foreground)]" },
    },
  },
  defaultVariants: { status: "neutral" },
});

const surfaceMetricRecipeStyles = tv({
  slots: {
    root: "surface-metric__root min-w-0",
    card: "surface-metric__card border-s-[3px] border-solid",
    description: "surface-metric__description text-muted-foreground",
    state: "surface-metric__state [--svadmin-metric-state-border-width:3px]",
  },
  variants: {
    tone: {
      neutral: { card: "border-s-border", state: "[--svadmin-metric-state-accent:var(--border)]" },
      success: { card: "border-s-success", state: "[--svadmin-metric-state-accent:var(--success)]" },
      warning: { card: "border-s-warning", state: "[--svadmin-metric-state-accent:var(--warning)]" },
      danger: { card: "border-s-destructive", state: "[--svadmin-metric-state-accent:var(--destructive)]" },
      info: { card: "border-s-info", state: "[--svadmin-metric-state-accent:var(--info)]" },
    },
    density: {
      compact: { card: "p-3", state: "[--svadmin-metric-state-padding:0.75rem] [--svadmin-metric-state-height:4.5rem]" },
      comfortable: { card: "p-5", state: "[--svadmin-metric-state-padding:1.25rem] [--svadmin-metric-state-height:6rem]" },
    },
  },
  defaultVariants: { tone: "neutral", density: "comfortable" },
});

const surfaceTableRecipeStyles = tv({
  slots: {
    root: "surface-table__root min-w-0",
    header: "surface-table__header",
    content: "surface-table__content",
    head: "surface-table__head",
    cell: "surface-table__cell",
    state: "surface-table__state text-muted-foreground",
  },
  variants: {
    density: {
      compact: { header: "px-3", content: "px-3", head: "[&[data-slot=table-head]]:py-1 [&[data-slot=table-head]]:text-xs", cell: "[&[data-slot=table-cell]]:py-1 [&[data-slot=table-cell]]:text-xs", state: "[--svadmin-table-state-height:6rem]" },
      comfortable: { header: "px-4", content: "px-4", head: "[&[data-slot=table-head]]:py-2 [&[data-slot=table-head]]:text-sm", cell: "[&[data-slot=table-cell]]:py-2 [&[data-slot=table-cell]]:text-sm", state: "[--svadmin-table-state-height:8rem]" },
    },
  },
  defaultVariants: { density: "comfortable" },
});

// undefined 使用公开默认值；null 显式禁用该变体，不能交给 tv 再补默认值。
export const buttonRecipe = ({
  variant = buttonRecipeDefaults.variant,
  size = buttonRecipeDefaults.size,
  ...props
}: ButtonRecipeProps = {}) => ({
  root: buttonRecipeStyles({
    ...props,
    ...(variant === null ? {} : { variant }),
    ...(size === null ? {} : { size }),
  }),
});
export const badgeRecipe = ({
  variant = badgeRecipeDefaults.variant,
  ...props
}: BadgeRecipeProps = {}) => ({
  root: badgeRecipeStyles({ ...props, ...(variant === null ? {} : { variant }) }),
});
export const textareaRecipe = (props: Parameters<typeof textareaRecipeStyles>[0] = {}) => ({ root: textareaRecipeStyles(props) });
export const contentPageRecipe = (props: Parameters<typeof contentPageRecipeStyles>[0] = {}) => resolveSlots(contentPageRecipeStyles(props));
export const contentHeaderRecipe = (props: Parameters<typeof contentHeaderRecipeStyles>[0] = {}) => resolveSlots(contentHeaderRecipeStyles(props));
export const metricBlockRecipe = (props: Parameters<typeof metricBlockRecipeStyles>[0] = {}) => resolveSlots(metricBlockRecipeStyles(props));
export const productSectionRecipe = (props: Parameters<typeof productSectionRecipeStyles>[0] = {}) => resolveSlots(productSectionRecipeStyles(props));
export const productToolbarRecipe = (props: Parameters<typeof productToolbarRecipeStyles>[0] = {}) => resolveSlots(productToolbarRecipeStyles(props));
export const productWorkspaceRecipe = (props: Parameters<typeof productWorkspaceRecipeStyles>[0] = {}) => resolveSlots(productWorkspaceRecipeStyles(props));
export const productSettingsRecipe = (props: Parameters<typeof productSettingsRecipeStyles>[0] = {}) => resolveSlots(productSettingsRecipeStyles(props));
export const productSettingsRowRecipe = (props: Parameters<typeof productSettingsRowRecipeStyles>[0] = {}) => resolveSlots(productSettingsRowRecipeStyles(props));
export const productStatusRecipe = (props: Parameters<typeof productStatusRecipeStyles>[0] = {}) => resolveSlots(productStatusRecipeStyles(props));
export const surfaceMetricRecipe = (props: Parameters<typeof surfaceMetricRecipeStyles>[0] = {}) => resolveSlots(surfaceMetricRecipeStyles(props));
export const surfaceTableRecipe = (props: Parameters<typeof surfaceTableRecipeStyles>[0] = {}) => resolveSlots(surfaceTableRecipeStyles(props));

export const allRecipes = {
  buttonRecipe,
  badgeRecipe,
  textareaRecipe,
  contentPageRecipe,
  contentHeaderRecipe,
  metricBlockRecipe,
  productSectionRecipe,
  productToolbarRecipe,
  productWorkspaceRecipe,
  productSettingsRecipe,
  productSettingsRowRecipe,
  productStatusRecipe,
  surfaceMetricRecipe,
  surfaceTableRecipe,
};

// 元数据从相同的 variant 定义派生，避免提示词中的枚举与实际实现分叉。
const recipeStyles = {
  buttonRecipe: buttonRecipeStyles, badgeRecipe: badgeRecipeStyles, textareaRecipe: textareaRecipeStyles,
  contentPageRecipe: contentPageRecipeStyles, contentHeaderRecipe: contentHeaderRecipeStyles,
  metricBlockRecipe: metricBlockRecipeStyles, productSectionRecipe: productSectionRecipeStyles,
  productToolbarRecipe: productToolbarRecipeStyles, productWorkspaceRecipe: productWorkspaceRecipeStyles,
  productSettingsRecipe: productSettingsRecipeStyles, productSettingsRowRecipe: productSettingsRowRecipeStyles,
  productStatusRecipe: productStatusRecipeStyles, surfaceMetricRecipe: surfaceMetricRecipeStyles,
  surfaceTableRecipe: surfaceTableRecipeStyles,
} satisfies Record<keyof typeof allRecipes, unknown>;

export function describeRecipe(name: keyof typeof allRecipes) {
  const styles = recipeStyles[name];
  const slots = Object.keys(styles.slots ?? {}).filter(slot => slot !== "base");
  return {
    slots: slots.length > 0 ? slots : ["root"],
    variants: Object.fromEntries(Object.entries(styles.variants ?? {}).map(([key, values]) => [key, Object.keys(values)])),
    defaults: {
      ...(name === "buttonRecipe" ? buttonRecipeDefaults
        : name === "badgeRecipe" ? badgeRecipeDefaults : styles.defaultVariants),
    },
  };
}
