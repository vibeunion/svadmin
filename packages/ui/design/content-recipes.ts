import { defineSlotRecipe } from '@pandacss/dev';

export const contentPage = defineSlotRecipe({
  className: 'content-page',
  slots: ['root'],
  base: {
    root: {
      marginInline: 'auto',
      width: '100%',
      ':where(& > :not(:last-child))': {
        marginBlockStart: '0px',
        marginBlockEnd: 'content.page',
      },
    },
  },
  variants: {
    width: {
      narrow: { root: { maxWidth: 'content.narrow' } },
      default: { root: { maxWidth: 'content.default' } },
      wide: { root: { maxWidth: 'content.wide' } },
    },
  },
  defaultVariants: { width: 'default' },
});

export const contentHeader = defineSlotRecipe({
  className: 'content-header',
  slots: ['root', 'breadcrumbs', 'currentCrumb', 'row', 'heading', 'eyebrow', 'title', 'description', 'actions'],
  base: {
    root: {
      ':where(& > :not(:last-child))': {
        marginBlockStart: '0px', marginBlockEnd: 'content.section',
      },
    },
    breadcrumbs: {
      display: 'flex', alignItems: 'center', gap: 'content.inline',
      fontSize: 'content.caption', lineHeight: 'content.caption', color: 'content.muted',
    },
    currentCrumb: { color: 'content.foreground' },
    row: {
      display: 'flex', flexDirection: 'column', gap: 'content.panel',
      '@media (width >= 40rem)': {
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
      },
    },
    heading: {
      minWidth: '0px',
      ':where(& > :not(:last-child))': {
        marginBlockStart: '0px', marginBlockEnd: 'content.stack',
      },
    },
    eyebrow: {
      fontSize: 'content.caption', lineHeight: 'content.caption',
      fontWeight: 'content.medium', color: 'content.muted',
    },
    title: {
      fontSize: 'content.title', lineHeight: 'content.title',
      fontWeight: 'content.strong', letterSpacing: 'content.normal', color: 'content.foreground',
    },
    description: {
      maxWidth: 'content.description', fontSize: 'content.body',
      lineHeight: 'content.description', color: 'content.muted',
    },
    actions: {
      display: 'flex', flexShrink: '0', flexWrap: 'wrap', alignItems: 'center', gap: 'content.inline',
    },
  },
});

export const metricBlock = defineSlotRecipe({
  className: 'metric-block',
  slots: ['root', 'header', 'label', 'icon', 'skeleton', 'value', 'meta', 'trend', 'detail'],
  base: {
    root: {
      minWidth: '0px', borderRadius: 'content.card', borderStyle: 'solid',
      borderWidth: '1px', borderColor: 'content.border', backgroundColor: 'content.card',
      padding: 'content.panel', boxShadow: 'content.card',
      // The old clean-flat rule identified cards by a generated bg-card class.
      // Keep that theme behavior without retaining a legacy utility alias.
      '.layout-clean-flat [data-svadmin-content-page] &': {
        minWidth: '0px', borderColor: 'var(--svadmin-border)', borderRadius: 'content.card',
        background: 'var(--svadmin-surface)', boxShadow: 'var(--svadmin-surface-shadow)',
      },
    },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'content.section' },
    label: { fontSize: 'content.body', lineHeight: 'content.body', color: 'content.muted' },
    icon: { color: 'content.muted' },
    skeleton: { marginTop: 'content.section', height: 'content.skeletonHeight', width: 'content.skeletonWidth' },
    value: {
      marginTop: 'content.inline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      fontSize: 'content.metric', lineHeight: 'content.metric', fontWeight: 'content.strong',
      letterSpacing: 'content.normal', color: 'content.foreground', fontVariantNumeric: 'tabular-nums',
    },
    meta: { marginTop: 'content.inline', display: 'flex', flexWrap: 'wrap', gap: 'content.inline', fontSize: 'content.caption', lineHeight: 'content.caption' },
    trend: { fontWeight: 'content.medium', fontVariantNumeric: 'tabular-nums' },
    detail: { color: 'content.muted' },
  },
  variants: {
    trendTone: {
      positive: { trend: { color: 'content.positive' } },
      negative: { trend: { color: 'content.negative' } },
      warning: { trend: { color: 'content.warning' } },
      neutral: { trend: { color: 'content.muted' } },
    },
  },
  defaultVariants: { trendTone: 'neutral' },
});
