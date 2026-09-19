import { defineSlotRecipe } from '@pandacss/dev';

// Stripe-first：只引用既有主题，不引入供应商调色板。尺寸是 svadmin 决策，
// 来源与不采纳项见 design/stripe-first/reference-decisions.md。
const gap = (steps: number) => `calc(var(--spacing, 0.25rem) * ${steps})`;
const text = { color: 'foreground', fontSize: 'body', lineHeight: '1.5' };
const caption = { color: 'muted', fontSize: '0.8125rem', lineHeight: '1.5' };
const group = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: gap(2), minWidth: '0' };

export const productSection = defineSlotRecipe({
  className: 'product-section',
  slots: ['root', 'heading', 'title', 'description', 'actions'],
  base: {
    root: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: gap(3) },
    heading: { minWidth: '0', flex: '1 1 16rem' },
    title: { ...text, margin: '0', fontSize: '1rem', fontWeight: '600', overflowWrap: 'anywhere' },
    description: { ...caption, margin: `${gap(1)} 0 0`, maxWidth: '65ch' },
    actions: { ...group, flexShrink: '0' },
  },
});

export const productToolbar = defineSlotRecipe({
  className: 'product-toolbar',
  slots: ['root', 'leading', 'trailing'],
  base: {
    root: { ...group, justifyContent: 'space-between', gap: gap(3), paddingBlock: gap(3), borderBottom: '1px solid', borderColor: 'border' },
    leading: { ...group, flex: '1 1 16rem' },
    trailing: { ...group, marginInlineStart: 'auto' },
  },
});

export const productWorkspace = defineSlotRecipe({
  className: 'product-workspace',
  slots: ['root', 'summary', 'columns', 'primary', 'secondary'],
  base: {
    root: { display: 'flex', flexDirection: 'column', gap: gap(6), minWidth: '0' },
    summary: { minWidth: '0' },
    columns: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start', gap: gap(8), minWidth: '0' },
    primary: { minWidth: '0' },
    secondary: { minWidth: '0', display: 'flex', flexDirection: 'column', gap: gap(6) },
  },
  variants: {
    hasSecondary: {
      true: {
        columns: { '@media (min-width: 64rem)': { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, var(--workspace-secondary-width, 22rem))' } },
        primary: { '@media (min-width: 64rem)': { order: '1' } },
        secondary: { '@media (min-width: 64rem)': { order: '2' } },
      },
      false: {},
    },
  },
  defaultVariants: { hasSecondary: false },
});

export const productSettings = defineSlotRecipe({
  className: 'product-settings',
  slots: ['root', 'header', 'heading', 'title', 'description', 'actions', 'body'],
  base: {
    root: { ...text, minWidth: '0' },
    header: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: gap(3), paddingBlock: gap(4), borderBottom: '1px solid', borderColor: 'border' },
    heading: { minWidth: '0', flex: '1 1 16rem' },
    title: { ...text, fontSize: '1rem', fontWeight: '600', margin: '0', overflowWrap: 'anywhere' },
    description: { ...caption, margin: `${gap(1)} 0 0`, maxWidth: '65ch' },
    actions: { ...group, flexShrink: '0' },
    body: { minWidth: '0', paddingBlock: gap(1) },
  },
});

export const productSettingsRow = defineSlotRecipe({
  className: 'product-settings-row',
  slots: ['root', 'heading', 'label', 'description', 'control'],
  base: {
    root: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start', gap: gap(3), paddingBlock: gap(5), minWidth: '0', '@media (min-width: 48rem)': { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', columnGap: gap(6) } },
    heading: { minWidth: '0' },
    label: { ...text, margin: '0', fontWeight: '500', overflowWrap: 'anywhere' },
    description: { ...caption, margin: `${gap(1)} 0 0`, maxWidth: '52ch', overflowWrap: 'anywhere' },
    control: { minWidth: '0', maxWidth: '100%' },
  },
  variants: { separated: { true: { root: { borderTop: '1px solid', borderColor: 'border' } }, false: {} } },
  defaultVariants: { separated: false },
});

/** 可复用的业务组合部件；状态/数据/授权仍由宿主负责，不增加 Surface 能力。 */
export const productList = defineSlotRecipe({
  className: 'product-list',
  slots: ['filters', 'filter', 'filterCount', 'table', 'identity', 'avatar', 'name', 'secondary', 'numeric', 'footer', 'help'],
  base: {
    filters: { ...group, gap: gap(1), paddingBottom: gap(3), borderBottom: '1px solid', borderColor: 'border' },
    filter: { ...group, gap: gap(2), border: '0', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'muted', fontSize: 'body', fontWeight: '500', padding: `${gap(1.5)} ${gap(3)}`, cursor: 'pointer', '&[aria-pressed=true]': { background: 'var(--accent)', color: 'var(--accent-foreground)' }, '&:hover': { background: 'var(--muted)' }, '&:focus-visible': { outline: '2px solid var(--ring)', outlineOffset: '2px' } },
    filterCount: { fontSize: 'compact', fontVariantNumeric: 'tabular-nums', color: 'inherit' },
    table: {
      minWidth: '0', maxWidth: '100%', overflowX: 'auto', borderBlock: '1px solid', borderColor: 'border',
      '& > [data-slot=table-container]': { overflow: 'visible' },
      '&:focus-visible': { outline: '2px solid var(--ring)', outlineOffset: '2px' },
      '& [data-slot=table]': { width: '100%', borderCollapse: 'collapse', fontSize: 'body' },
      '& [data-slot=table-head]': { color: 'muted', fontSize: '0.8125rem', fontWeight: '500', textAlign: 'start', whiteSpace: 'nowrap', padding: `${gap(3)} ${gap(4)}`, borderBottom: '1px solid', borderColor: 'border' },
      '& [data-slot=table-cell]': { padding: `${gap(3)} ${gap(4)}`, verticalAlign: 'middle' },
      '& tbody [data-slot=table-row]:not(:last-child)': { borderBottom: '1px solid', borderColor: 'border' },
      '& tbody [data-slot=table-row]:hover': { background: 'var(--muted)' },
      '& [data-table-density=comfortable] [data-slot=table-cell]': { paddingBlock: gap(4) },
      '& [data-align=end]': { textAlign: 'end' },
      '& [data-slot=table-caption]': { textAlign: 'start', padding: `${gap(3)} ${gap(4)}`, color: 'muted', fontSize: 'compact' },
    },
    identity: { display: 'flex', alignItems: 'center', gap: gap(3), minWidth: '12rem' },
    avatar: { display: 'grid', placeItems: 'center', flexShrink: '0', width: '2rem', height: '2rem', background: 'var(--muted)', color: 'muted', border: '1px solid', borderColor: 'border', borderRadius: 'var(--radius-md)', fontSize: 'compact', fontWeight: '600' },
    name: { ...text, fontWeight: '500', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '28rem' },
    secondary: { ...caption, fontSize: 'compact', display: 'block', overflowWrap: 'anywhere' },
    numeric: { fontVariantNumeric: 'tabular-nums', textAlign: 'end', whiteSpace: 'nowrap' },
    footer: { ...group, justifyContent: 'space-between', color: 'muted', fontSize: '0.8125rem', paddingBlock: gap(3) },
    help: { ...caption, margin: '0', maxWidth: '65ch' },
  },
});

// 不把实心警告背景的 warning-foreground 用于浅色标签。
// 与带显式色相的中性色混合时，使用矩形 Oklab 空间，避免 Oklch 色相旋转。
// 不支持 color-mix 时保留可读的 foreground/muted 回退。
export const productStatus = defineSlotRecipe({
  className: 'product-status',
  slots: ['root'],
  base: {
    root: {
      '--svadmin-status-color': 'var(--muted-foreground)',
      '&[data-slot=badge]': {
        background: 'var(--muted)', color: 'var(--foreground)',
        borderColor: 'var(--svadmin-status-color)', whiteSpace: 'nowrap',
        '@supports (color: color-mix(in oklab, black, white))': {
          background: 'color-mix(in oklab, var(--svadmin-status-color) 10%, var(--card))',
          borderColor: 'color-mix(in oklab, var(--svadmin-status-color) 25%, var(--card))',
          color: 'color-mix(in oklab, var(--svadmin-status-color) 35%, var(--foreground))',
        },
      },
    },
  },
  variants: {
    status: {
      success: { root: { '--svadmin-status-color': 'var(--success)' } },
      warning: { root: { '--svadmin-status-color': 'var(--warning)' } },
      danger: { root: { '--svadmin-status-color': 'var(--destructive)' } },
      info: { root: { '--svadmin-status-color': 'var(--info)' } },
      neutral: { root: { '--svadmin-status-color': 'var(--muted-foreground)' } },
    },
  },
  defaultVariants: { status: 'neutral' },
});
