// Content recipes retain the existing public theme variables. These are build-time
// token definitions, not an additional runtime theme engine or an AI style API.
export const contentTokens = {
  spacing: {
    content: {
      stack: { value: 'var(--spacing)' },
      inline: { value: 'calc(var(--spacing) * 2)' },
      section: { value: 'calc(var(--spacing) * 3)' },
      panel: { value: 'calc(var(--spacing) * 4)' },
      page: { value: 'calc(var(--spacing) * 6)' },
    },
  },
  sizes: {
    content: {
      narrow: { value: 'var(--container-3xl)' },
      default: { value: '74rem' },
      wide: { value: '92rem' },
      description: { value: 'var(--container-2xl)' },
      skeletonHeight: { value: 'calc(var(--spacing) * 8)' },
      skeletonWidth: { value: 'calc(var(--spacing) * 24)' },
    },
  },
  fontSizes: {
    content: {
      caption: { value: 'var(--text-xs)' },
      body: { value: 'var(--text-sm)' },
      title: { value: 'var(--text-xl)' },
      metric: { value: 'var(--text-2xl)' },
    },
  },
  lineHeights: {
    content: {
      caption: { value: 'var(--text-xs--line-height)' },
      body: { value: 'var(--text-sm--line-height)' },
      title: { value: 'var(--leading-tight)' },
      description: { value: 'calc(var(--spacing) * 6)' },
      metric: { value: 'var(--text-2xl--line-height)' },
    },
  },
  fontWeights: {
    content: {
      medium: { value: 'var(--font-weight-medium)' },
      strong: { value: 'var(--font-weight-semibold)' },
    },
  },
  letterSpacings: {
    content: { normal: { value: 'var(--tracking-normal)' } },
  },
  shadows: {
    content: {
      // Preserve the baseline raster without carrying its utility composition runtime.
      card: { value: '0 0 0 0 transparent, 0 0 0 0 transparent, 0 0 0 0 transparent, 0 0 0 0 transparent, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
    },
  },
};

export const contentSemanticTokens = {
  colors: {
    content: {
      foreground: { value: 'var(--color-foreground)' },
      muted: { value: 'var(--color-muted-foreground)' },
      card: { value: 'var(--color-card)' },
      border: { value: 'var(--color-border)' },
      positive: { value: 'var(--color-success)' },
      negative: { value: 'var(--color-destructive)' },
      warning: { value: 'var(--color-warning-foreground)' },
    },
  },
  radii: { content: { card: { value: 'var(--radius-lg)' } } },
};
