const tokens = {
  "spacing.xs": {
    "value": "0.25rem",
    "variable": "var(--svadmin-spacing-xs)"
  },
  "spacing.sm": {
    "value": "0.75rem",
    "variable": "var(--svadmin-spacing-sm)"
  },
  "spacing.md": {
    "value": "1rem",
    "variable": "var(--svadmin-spacing-md)"
  },
  "spacing.lg": {
    "value": "1.25rem",
    "variable": "var(--svadmin-spacing-lg)"
  },
  "spacing.content.stack": {
    "value": "var(--spacing)",
    "variable": "var(--svadmin-spacing-content-stack)"
  },
  "spacing.content.inline": {
    "value": "calc(var(--spacing) * 2)",
    "variable": "var(--svadmin-spacing-content-inline)"
  },
  "spacing.content.section": {
    "value": "calc(var(--spacing) * 3)",
    "variable": "var(--svadmin-spacing-content-section)"
  },
  "spacing.content.panel": {
    "value": "calc(var(--spacing) * 4)",
    "variable": "var(--svadmin-spacing-content-panel)"
  },
  "spacing.content.page": {
    "value": "calc(var(--spacing) * 6)",
    "variable": "var(--svadmin-spacing-content-page)"
  },
  "sizes.content.narrow": {
    "value": "var(--container-3xl)",
    "variable": "var(--svadmin-sizes-content-narrow)"
  },
  "sizes.content.default": {
    "value": "74rem",
    "variable": "var(--svadmin-sizes-content-default)"
  },
  "sizes.content.wide": {
    "value": "92rem",
    "variable": "var(--svadmin-sizes-content-wide)"
  },
  "sizes.content.description": {
    "value": "var(--container-2xl)",
    "variable": "var(--svadmin-sizes-content-description)"
  },
  "sizes.content.skeletonHeight": {
    "value": "calc(var(--spacing) * 8)",
    "variable": "var(--svadmin-sizes-content-skeleton-height)"
  },
  "sizes.content.skeletonWidth": {
    "value": "calc(var(--spacing) * 24)",
    "variable": "var(--svadmin-sizes-content-skeleton-width)"
  },
  "fontSizes.compact": {
    "value": "0.75rem",
    "variable": "var(--svadmin-font-sizes-compact)"
  },
  "fontSizes.body": {
    "value": "0.875rem",
    "variable": "var(--svadmin-font-sizes-body)"
  },
  "fontSizes.content.caption": {
    "value": "var(--text-xs)",
    "variable": "var(--svadmin-font-sizes-content-caption)"
  },
  "fontSizes.content.body": {
    "value": "var(--text-sm)",
    "variable": "var(--svadmin-font-sizes-content-body)"
  },
  "fontSizes.content.title": {
    "value": "var(--text-xl)",
    "variable": "var(--svadmin-font-sizes-content-title)"
  },
  "fontSizes.content.metric": {
    "value": "var(--text-2xl)",
    "variable": "var(--svadmin-font-sizes-content-metric)"
  },
  "lineHeights.content.caption": {
    "value": "var(--text-xs--line-height)",
    "variable": "var(--svadmin-line-heights-content-caption)"
  },
  "lineHeights.content.body": {
    "value": "var(--text-sm--line-height)",
    "variable": "var(--svadmin-line-heights-content-body)"
  },
  "lineHeights.content.title": {
    "value": "var(--leading-tight)",
    "variable": "var(--svadmin-line-heights-content-title)"
  },
  "lineHeights.content.description": {
    "value": "calc(var(--spacing) * 6)",
    "variable": "var(--svadmin-line-heights-content-description)"
  },
  "lineHeights.content.metric": {
    "value": "var(--text-2xl--line-height)",
    "variable": "var(--svadmin-line-heights-content-metric)"
  },
  "fontWeights.content.medium": {
    "value": "var(--font-weight-medium)",
    "variable": "var(--svadmin-font-weights-content-medium)"
  },
  "fontWeights.content.strong": {
    "value": "var(--font-weight-semibold)",
    "variable": "var(--svadmin-font-weights-content-strong)"
  },
  "letterSpacings.content.normal": {
    "value": "var(--tracking-normal)",
    "variable": "var(--svadmin-letter-spacings-content-normal)"
  },
  "shadows.content.card": {
    "value": "0 0 0 0 transparent, 0 0 0 0 transparent, 0 0 0 0 transparent, 0 0 0 0 transparent, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    "variable": "var(--svadmin-shadows-content-card)"
  },
  "colors.surface": {
    "value": "var(--card)",
    "variable": "var(--svadmin-colors-surface)"
  },
  "colors.foreground": {
    "value": "var(--foreground)",
    "variable": "var(--svadmin-colors-foreground)"
  },
  "colors.muted": {
    "value": "var(--muted-foreground)",
    "variable": "var(--svadmin-colors-muted)"
  },
  "colors.border": {
    "value": "var(--border)",
    "variable": "var(--svadmin-colors-border)"
  },
  "colors.success": {
    "value": "var(--success)",
    "variable": "var(--svadmin-colors-success)"
  },
  "colors.warning": {
    "value": "var(--warning)",
    "variable": "var(--svadmin-colors-warning)"
  },
  "colors.danger": {
    "value": "var(--destructive)",
    "variable": "var(--svadmin-colors-danger)"
  },
  "colors.info": {
    "value": "var(--info)",
    "variable": "var(--svadmin-colors-info)"
  },
  "colors.content.foreground": {
    "value": "var(--color-foreground)",
    "variable": "var(--svadmin-colors-content-foreground)"
  },
  "colors.content.muted": {
    "value": "var(--color-muted-foreground)",
    "variable": "var(--svadmin-colors-content-muted)"
  },
  "colors.content.card": {
    "value": "var(--color-card)",
    "variable": "var(--svadmin-colors-content-card)"
  },
  "colors.content.border": {
    "value": "var(--color-border)",
    "variable": "var(--svadmin-colors-content-border)"
  },
  "colors.content.positive": {
    "value": "var(--color-success)",
    "variable": "var(--svadmin-colors-content-positive)"
  },
  "colors.content.negative": {
    "value": "var(--color-destructive)",
    "variable": "var(--svadmin-colors-content-negative)"
  },
  "colors.content.warning": {
    "value": "var(--color-warning-foreground)",
    "variable": "var(--svadmin-colors-content-warning)"
  },
  "radii.surface": {
    "value": "var(--radius-lg)",
    "variable": "var(--svadmin-radii-surface)"
  },
  "radii.content.card": {
    "value": "var(--radius-lg)",
    "variable": "var(--svadmin-radii-content-card)"
  },
  "spacing.-xs": {
    "value": "calc(var(--svadmin-spacing-xs) * -1)",
    "variable": "var(--svadmin-spacing-xs)"
  },
  "spacing.-sm": {
    "value": "calc(var(--svadmin-spacing-sm) * -1)",
    "variable": "var(--svadmin-spacing-sm)"
  },
  "spacing.-md": {
    "value": "calc(var(--svadmin-spacing-md) * -1)",
    "variable": "var(--svadmin-spacing-md)"
  },
  "spacing.-lg": {
    "value": "calc(var(--svadmin-spacing-lg) * -1)",
    "variable": "var(--svadmin-spacing-lg)"
  },
  "spacing.content.-stack": {
    "value": "calc(var(--svadmin-spacing-content-stack) * -1)",
    "variable": "var(--svadmin-spacing-content-stack)"
  },
  "spacing.content.-inline": {
    "value": "calc(var(--svadmin-spacing-content-inline) * -1)",
    "variable": "var(--svadmin-spacing-content-inline)"
  },
  "spacing.content.-section": {
    "value": "calc(var(--svadmin-spacing-content-section) * -1)",
    "variable": "var(--svadmin-spacing-content-section)"
  },
  "spacing.content.-panel": {
    "value": "calc(var(--svadmin-spacing-content-panel) * -1)",
    "variable": "var(--svadmin-spacing-content-panel)"
  },
  "spacing.content.-page": {
    "value": "calc(var(--svadmin-spacing-content-page) * -1)",
    "variable": "var(--svadmin-spacing-content-page)"
  },
  "colors.colorPalette": {
    "value": "var(--svadmin-colors-color-palette)",
    "variable": "var(--svadmin-colors-color-palette)"
  },
  "colors.colorPalette.foreground": {
    "value": "var(--svadmin-colors-color-palette-foreground)",
    "variable": "var(--svadmin-colors-color-palette-foreground)"
  },
  "colors.colorPalette.muted": {
    "value": "var(--svadmin-colors-color-palette-muted)",
    "variable": "var(--svadmin-colors-color-palette-muted)"
  },
  "colors.colorPalette.card": {
    "value": "var(--svadmin-colors-color-palette-card)",
    "variable": "var(--svadmin-colors-color-palette-card)"
  },
  "colors.colorPalette.border": {
    "value": "var(--svadmin-colors-color-palette-border)",
    "variable": "var(--svadmin-colors-color-palette-border)"
  },
  "colors.colorPalette.positive": {
    "value": "var(--svadmin-colors-color-palette-positive)",
    "variable": "var(--svadmin-colors-color-palette-positive)"
  },
  "colors.colorPalette.negative": {
    "value": "var(--svadmin-colors-color-palette-negative)",
    "variable": "var(--svadmin-colors-color-palette-negative)"
  },
  "colors.colorPalette.warning": {
    "value": "var(--svadmin-colors-color-palette-warning)",
    "variable": "var(--svadmin-colors-color-palette-warning)"
  }
}

export function token(path, fallback) {
  return tokens[path]?.value || fallback
}

function tokenVar(path, fallback) {
  return tokens[path]?.variable || fallback
}

token.var = tokenVar