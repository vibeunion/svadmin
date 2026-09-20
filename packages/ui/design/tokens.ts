/** 设计资产独立于组件。既有公开 CSS 变量仍是主题覆盖接口。 */
export const designTokens = {
  spacing: {
    xs: { value: '0.25rem' },
    sm: { value: '0.75rem' },
    md: { value: '1rem' },
    lg: { value: '1.25rem' },
  },
  fontSizes: {
    compact: { value: '0.75rem' },
    body: { value: '0.875rem' },
  },
};

export const semanticTokens = {
  colors: {
    surface: { value: 'var(--card)' },
    foreground: { value: 'var(--foreground)' },
    muted: { value: 'var(--muted-foreground)' },
    border: { value: 'var(--border)' },
    success: { value: 'var(--success)' },
    warning: { value: 'var(--warning)' },
    danger: { value: 'var(--destructive)' },
    info: { value: 'var(--info)' },
  },
  radii: { surface: { value: 'var(--radius-lg)' } },
};
