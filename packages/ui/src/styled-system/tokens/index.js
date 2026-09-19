const tokens = {
  "radii.sm": {
    "value": "calc(var(--radius) - 4px)",
    "variable": "var(--radii-sm)"
  },
  "radii.md": {
    "value": "calc(var(--radius) - 2px)",
    "variable": "var(--radii-md)"
  },
  "radii.lg": {
    "value": "var(--radius)",
    "variable": "var(--radii-lg)"
  },
  "radii.xl": {
    "value": "calc(var(--radius) + 4px)",
    "variable": "var(--radii-xl)"
  },
  "fontSizes.xs": {
    "value": "0.75rem",
    "variable": "var(--font-sizes-xs)"
  },
  "fontSizes.sm": {
    "value": "0.875rem",
    "variable": "var(--font-sizes-sm)"
  },
  "fontSizes.md": {
    "value": "1rem",
    "variable": "var(--font-sizes-md)"
  },
  "fontSizes.lg": {
    "value": "1.125rem",
    "variable": "var(--font-sizes-lg)"
  },
  "breakpoints.sm": {
    "value": "640px",
    "variable": "var(--breakpoints-sm)"
  },
  "breakpoints.md": {
    "value": "768px",
    "variable": "var(--breakpoints-md)"
  },
  "breakpoints.lg": {
    "value": "1024px",
    "variable": "var(--breakpoints-lg)"
  },
  "breakpoints.xl": {
    "value": "1280px",
    "variable": "var(--breakpoints-xl)"
  },
  "breakpoints.2xl": {
    "value": "1536px",
    "variable": "var(--breakpoints-2xl)"
  },
  "sizes.breakpoint-sm": {
    "value": "640px",
    "variable": "var(--sizes-breakpoint-sm)"
  },
  "sizes.breakpoint-md": {
    "value": "768px",
    "variable": "var(--sizes-breakpoint-md)"
  },
  "sizes.breakpoint-lg": {
    "value": "1024px",
    "variable": "var(--sizes-breakpoint-lg)"
  },
  "sizes.breakpoint-xl": {
    "value": "1280px",
    "variable": "var(--sizes-breakpoint-xl)"
  },
  "sizes.breakpoint-2xl": {
    "value": "1536px",
    "variable": "var(--sizes-breakpoint-2xl)"
  },
  "colors.background": {
    "value": "var(--background)",
    "variable": "var(--colors-background)"
  },
  "colors.foreground": {
    "value": "var(--foreground)",
    "variable": "var(--colors-foreground)"
  },
  "colors.card": {
    "value": "var(--card)",
    "variable": "var(--colors-card)"
  },
  "colors.card-foreground": {
    "value": "var(--card-foreground)",
    "variable": "var(--colors-card-foreground)"
  },
  "colors.popover": {
    "value": "var(--popover)",
    "variable": "var(--colors-popover)"
  },
  "colors.popover-foreground": {
    "value": "var(--popover-foreground)",
    "variable": "var(--colors-popover-foreground)"
  },
  "colors.primary": {
    "value": "var(--primary)",
    "variable": "var(--colors-primary)"
  },
  "colors.primary-foreground": {
    "value": "var(--primary-foreground)",
    "variable": "var(--colors-primary-foreground)"
  },
  "colors.secondary": {
    "value": "var(--secondary)",
    "variable": "var(--colors-secondary)"
  },
  "colors.secondary-foreground": {
    "value": "var(--secondary-foreground)",
    "variable": "var(--colors-secondary-foreground)"
  },
  "colors.muted": {
    "value": "var(--muted)",
    "variable": "var(--colors-muted)"
  },
  "colors.muted-foreground": {
    "value": "var(--muted-foreground)",
    "variable": "var(--colors-muted-foreground)"
  },
  "colors.accent": {
    "value": "var(--accent)",
    "variable": "var(--colors-accent)"
  },
  "colors.accent-foreground": {
    "value": "var(--accent-foreground)",
    "variable": "var(--colors-accent-foreground)"
  },
  "colors.destructive": {
    "value": "var(--destructive)",
    "variable": "var(--colors-destructive)"
  },
  "colors.destructive-foreground": {
    "value": "var(--destructive-foreground)",
    "variable": "var(--colors-destructive-foreground)"
  },
  "colors.border": {
    "value": "var(--border)",
    "variable": "var(--colors-border)"
  },
  "colors.input": {
    "value": "var(--input)",
    "variable": "var(--colors-input)"
  },
  "colors.ring": {
    "value": "var(--ring)",
    "variable": "var(--colors-ring)"
  },
  "colors.success": {
    "value": "var(--success)",
    "variable": "var(--colors-success)"
  },
  "colors.success-foreground": {
    "value": "var(--success-foreground)",
    "variable": "var(--colors-success-foreground)"
  },
  "colors.warning": {
    "value": "var(--warning)",
    "variable": "var(--colors-warning)"
  },
  "colors.warning-foreground": {
    "value": "var(--warning-foreground)",
    "variable": "var(--colors-warning-foreground)"
  },
  "colors.info": {
    "value": "var(--info)",
    "variable": "var(--colors-info)"
  },
  "colors.info-foreground": {
    "value": "var(--info-foreground)",
    "variable": "var(--colors-info-foreground)"
  },
  "colors.colorPalette": {
    "value": "var(--colors-color-palette)",
    "variable": "var(--colors-color-palette)"
  }
}

export function token(path, fallback) {
  return tokens[path]?.value || fallback
}

function tokenVar(path, fallback) {
  return tokens[path]?.variable || fallback
}

token.var = tokenVar