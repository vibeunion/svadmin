import type { RecipeConfig, SlotRecipeConfig } from '@pandacss/dev';

// 保留当前 Stripe-first tokens；本次不混入视觉改版或另一套颜色变量。
const supportsMix = '@supports (color: color-mix(in lab, red, red))';
const controlTransition = 'border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease';
const ring = (token: string) => ({
  borderColor: `var(--${token})`,
  boxShadow: `0 0 0 3px var(--${token})`,
  [supportsMix]: { boxShadow: `0 0 0 3px color-mix(in srgb, var(--${token}) 20%, transparent)` },
});
const controlStates = {
  '&:focus-visible': ring('ring'),
  '&[aria-invalid="true"]': ring('destructive'),
  '&:disabled': { cursor: 'not-allowed', opacity: '0.5' },
  '&::placeholder': { color: 'var(--muted-foreground)' },
} as const;
const subtle = (token: string) => ({
  // 不支持 color-mix 时仍需可读；语义由边框与标签表达，不能前景/背景同色。
  borderColor: `var(--${token})`, background: 'var(--muted)', color: 'var(--foreground)',
  [supportsMix]: {
    borderColor: `color-mix(in oklch, var(--${token}) 20%, transparent)`,
    background: `color-mix(in oklch, var(--${token}) 10%, transparent)`,
    color: `var(--${token})`,
  },
});

export const uiButton = {
  className: 'ui-button',
  base: {
    display: 'inline-flex', flexShrink: '0', alignItems: 'center', justifyContent: 'center',
    gap: '0.375rem', border: '1px solid transparent', borderRadius: 'var(--radius-md)',
    backgroundClip: 'padding-box', fontSize: '0.875rem', fontWeight: '500', lineHeight: '1',
    whiteSpace: 'nowrap', userSelect: 'none', outline: 'none',
    transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
    '& > svg': { width: '1rem', height: '1rem', flexShrink: '0', pointerEvents: 'none' },
    '&:active': { transform: 'translateY(1px)' },
    '&:disabled, &[aria-disabled="true"]': { pointerEvents: 'none', opacity: '0.5' },
  },
  variants: {
    variant: {
      default: {
        background: 'var(--primary)', color: 'var(--primary-foreground)',
        '&:hover': { background: 'var(--primary)', [supportsMix]: { background: 'color-mix(in oklch, var(--primary) 80%, var(--foreground))' } },
      },
      outline: {
        borderColor: 'var(--color-border, var(--border))', background: 'var(--background)', color: 'var(--foreground)',
        '&:hover': { background: 'var(--muted)' },
      },
      secondary: { background: 'var(--secondary)', color: 'var(--secondary-foreground)', '&:hover': { background: 'var(--muted)', color: 'var(--foreground)' } },
      ghost: { '&:hover': { background: 'var(--muted)', color: 'var(--foreground)' } },
      destructive: {
        background: 'var(--muted)', color: 'var(--foreground)', borderColor: 'var(--destructive)',
        [supportsMix]: { background: 'color-mix(in oklch, var(--destructive) 10%, transparent)', color: 'var(--destructive)', borderColor: 'transparent' },
        '&:hover': { background: 'var(--muted)', [supportsMix]: { background: 'color-mix(in oklch, var(--destructive) 20%, transparent)' } },
      },
      link: { color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: '0.25rem' },
    },
    size: {
      default: { minHeight: '2.25rem', padding: '0 0.75rem' },
      xs: { minHeight: '1.5rem', padding: '0 0.5rem', fontSize: '0.75rem' },
      sm: { minHeight: '2rem', padding: '0 0.75rem', fontSize: '0.8rem' },
      lg: { minHeight: '2.5rem', padding: '0 1rem' },
      icon: { width: '2.25rem', height: '2.25rem' },
      'icon-xs': { width: '1.5rem', height: '1.5rem' },
      'icon-sm': { width: '2rem', height: '2rem' },
      'icon-lg': { width: '2.5rem', height: '2.5rem' },
    },
  },
  // 默认值由公开 helper 处理；null 必须继续表示不应用该变体。
} satisfies RecipeConfig;

export const uiBadge = {
  className: 'ui-badge',
  base: {
    display: 'inline-flex', flexShrink: '0', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
    width: 'fit-content', minHeight: '1.25rem', overflow: 'hidden', border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)', padding: '0.125rem 0.625rem', fontSize: '0.75rem', fontWeight: '600',
    lineHeight: '1', whiteSpace: 'nowrap', transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease',
    '& > svg': { width: '0.75rem', height: '0.75rem', pointerEvents: 'none' },
  },
  variants: {
    variant: {
      default: { background: 'var(--primary)', color: 'var(--primary-foreground)' },
      secondary: { background: 'var(--secondary)', color: 'var(--secondary-foreground)' },
      destructive: subtle('destructive'),
      subtle: subtle('primary'),
      'subtle-success': subtle('success'),
      'subtle-warning': subtle('warning'),
      'subtle-destructive': subtle('destructive'),
      'subtle-pill': {
        borderColor: 'var(--border)', borderRadius: '999px', background: 'var(--muted)',
        color: 'var(--muted-foreground)', fontWeight: '500',
        [supportsMix]: { borderColor: 'color-mix(in oklch, var(--border) 80%, transparent)', background: 'color-mix(in oklch, var(--muted) 70%, transparent)' },
      },
      outline: { borderColor: 'var(--color-border, var(--border))', color: 'var(--foreground)', '&:hover': { background: 'var(--muted)', color: 'var(--muted-foreground)' } },
      ghost: { '&:hover': { background: 'var(--muted)', color: 'var(--muted-foreground)' } },
      link: { color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: '0.25rem' },
    },
  },
} satisfies RecipeConfig;

export const uiInput = {
  className: 'ui-input',
  slots: ['root', 'control', 'visual', 'button', 'name'],
  base: {
    root: { position: 'relative', width: '100%', minWidth: '0', height: '2.25rem' },
    control: {
      width: '100%', minWidth: '0', height: '2.25rem', border: '1px solid var(--border)',
      borderRadius: '0.5rem', background: 'transparent', color: 'var(--foreground)', outline: 'none',
      transition: controlTransition,
      '&:not([data-input-type="file"])': { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
      '&[data-input-type="file"]': { position: 'absolute', zIndex: '1', inset: '0', height: '100%', border: '0', padding: '0', opacity: '0', appearance: 'none', cursor: 'pointer' },
      '&[data-input-type="file"]:focus-visible + .svadmin-file-input__visual': ring('ring'),
      ...controlStates,
    },
    visual: {
      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', height: '100%', overflow: 'hidden',
      border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--card)', boxShadow: 'var(--shadow-control)',
      padding: '0.25rem 0.75rem 0.25rem 0.25rem', color: 'var(--muted-foreground)', pointerEvents: 'none',
      transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease',
      '.svadmin-file-input[data-disabled="true"] &': { opacity: '0.5' },
    },
    button: {
      flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', height: '1.75rem',
      border: '1px solid var(--border)', [supportsMix]: { border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' },
      borderRadius: '0.375rem', padding: '0 0.625rem', background: 'var(--muted)', color: 'var(--foreground)',
      font: 'inherit', fontSize: '0.75rem', whiteSpace: 'nowrap',
    },
    name: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  },
} satisfies SlotRecipeConfig;

export const uiTextarea = {
  className: 'ui-textarea',
  base: {
    width: '100%', minHeight: '5rem', resize: 'vertical', border: '1px solid var(--border)', borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem', background: 'transparent', color: 'var(--foreground)', font: 'inherit',
    fontSize: '0.875rem', outline: 'none', transition: controlTransition, ...controlStates,
  },
} satisfies RecipeConfig;
