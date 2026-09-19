import { defineSlotRecipe } from '@pandacss/dev';
import { surfaceDesignContract } from '../src/design-contract.js';

const toneTokens = {
  neutral: 'border', success: 'success', warning: 'warning', danger: 'danger', info: 'info',
} as const;

export const surfaceMetric = defineSlotRecipe({
  className: 'surface-metric',
  slots: ['root', 'card', 'description', 'state'],
  base: {
    root: { minWidth: '0' },
    card: { borderInlineStartStyle: 'solid', borderInlineStartWidth: '3px' },
    description: { color: 'muted' },
    state: { borderInlineStartStyle: 'solid', borderInlineStartWidth: '3px' },
  },
  variants: {
    tone: Object.fromEntries(surfaceDesignContract.metric.tone.map((tone) => [tone, {
      card: { borderInlineStartColor: toneTokens[tone] },
      state: { borderInlineStartColor: toneTokens[tone] },
    }])),
    density: Object.fromEntries(surfaceDesignContract.metric.density.map((density) => [density, {
      card: { padding: density === 'compact' ? 'sm' : 'lg' },
      state: { '--svadmin-metric-state-padding': density === 'compact' ? '0.75rem' : '1.25rem', '--svadmin-metric-state-height': density === 'compact' ? '4.5rem' : '6rem' },
    }])),
  },
  defaultVariants: { tone: 'neutral', density: 'comfortable' },
});

export const surfaceTable = defineSlotRecipe({
  className: 'surface-table',
  slots: ['root', 'header', 'content', 'head', 'cell', 'state'],
  base: { root: { minWidth: '0' }, state: { color: 'muted' } },
  variants: {
    density: Object.fromEntries(surfaceDesignContract.table.density.map((density) => [density, {
      header: { paddingInline: density === 'compact' ? 'sm' : 'md' },
      content: { paddingInline: density === 'compact' ? 'sm' : 'md' },
      head: { paddingBlock: density === 'compact' ? 'xs' : '0.5rem', fontSize: density === 'compact' ? 'compact' : 'body' },
      cell: { paddingBlock: density === 'compact' ? 'xs' : '0.5rem', fontSize: density === 'compact' ? 'compact' : 'body' },
      state: { '--svadmin-table-state-height': density === 'compact' ? '6rem' : '8rem' },
    }])),
  },
  defaultVariants: { density: 'comfortable' },
});
