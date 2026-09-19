import { defineConfig, defineRecipe } from '@pandacss/dev';

// 只生成 Surface 提案界面的有限变体；不扫描宿主代码，不引入全局 reset。
export default defineConfig({
  preflight: false,
  presets: ['@pandacss/preset-base'],
  include: [],
  outdir: '../../node_modules/.cache/svadmin-surface-panda',
  outExtension: 'mjs',
  prefix: 'svsurface',
  cssVarRoot: '.svadmin-surface-editor',
  layers: { reset: 'sv-surface.reset', base: 'sv-surface.base', tokens: 'sv-surface.tokens', recipes: 'sv-surface.recipes', utilities: 'sv-surface.utilities' },
  theme: {
    tokens: {
      colors: {
        background: { value: 'var(--card, #ffffff)' },
        foreground: { value: 'var(--foreground, #18181b)' },
        muted: { value: 'var(--muted-foreground, #52525b)' },
        border: { value: 'var(--border, #d4d4d8)' },
        primary: { value: 'var(--primary, #2563eb)' },
        onPrimary: { value: 'var(--primary-foreground, #ffffff)' },
        destructive: { value: 'var(--destructive, #b91c1c)' },
      },
      spacing: { sm: { value: '0.5rem' }, md: { value: '0.75rem' }, lg: { value: '1rem' } },
      radii: { control: { value: '0.375rem' }, panel: { value: '0.75rem' } },
    },
    recipes: {
      surfaceEditor: defineRecipe({
        className: 'surface-editor',
        base: {
          boxSizing: 'border-box', width: '100%', minWidth: 0,
          backgroundColor: 'background', color: 'foreground',
          border: '1px solid', borderColor: 'border', borderRadius: 'panel',
          fontFamily: 'inherit',
          '& [data-part="toolbar"]': { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'md', marginBottom: 'lg' },
          '& [data-part="actions"]': { display: 'flex', flexWrap: 'wrap', gap: 'sm', alignItems: 'center' },
          '& [data-part="title"]': { margin: 0, fontSize: '1rem', fontWeight: 600, overflowWrap: 'anywhere' },
          '& [data-part="status"]': { margin: '0.25rem 0 0', color: 'muted', fontSize: '0.875rem' },
          '& [data-part="error"]': { border: '1px solid', borderColor: 'destructive', color: 'destructive', borderRadius: 'control', padding: 'md', marginBottom: 'lg', overflowWrap: 'anywhere' },
          '& [data-part="viewport"]': { minWidth: 0 },
        },
        variants: { density: { compact: { padding: 'md' }, comfortable: { padding: 'lg' } } },
        defaultVariants: { density: 'comfortable' },
      }),
      surfaceEditorButton: defineRecipe({
        className: 'surface-editor-button',
        base: {
          appearance: 'none', border: '1px solid', borderColor: 'border', borderRadius: 'control',
          minHeight: '2.5rem', padding: '0.5rem 0.875rem', font: 'inherit', fontSize: '0.875rem',
          lineHeight: 1.25, cursor: 'pointer', maxWidth: '100%', whiteSpace: 'normal',
          _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
          _disabled: { opacity: 0.5, cursor: 'not-allowed' },
        },
        variants: { variant: {
          secondary: { backgroundColor: 'background', color: 'foreground' },
          primary: { backgroundColor: 'primary', color: 'onPrimary', borderColor: 'primary' },
        } },
        defaultVariants: { variant: 'secondary' },
      }),
    },
  },
  staticCss: { recipes: {
    surfaceEditor: [{ density: ['compact', 'comfortable'] }],
    surfaceEditorButton: [{ variant: ['secondary', 'primary'] }],
  } },
});
