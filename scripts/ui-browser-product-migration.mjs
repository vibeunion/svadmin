// Explicit #580 product visual system migration. These maps continue the
// historical reference above; every value is reviewed source data and is never
// read from the candidate stylesheet.
export const productLightTokenMigration = Object.freeze({
  '--radius': ['0.5rem', '0.25rem'],
  '--background': ['oklch(0.985 0.001 264)', '#F7F8FA'],
  '--foreground': ['oklch(0.205 0.012 264)', '#1D2129'],
  '--card': ['oklch(1 0 0)', '#FFFFFF'],
  '--card-foreground': ['oklch(0.205 0.012 264)', '#1D2129'],
  '--popover': ['oklch(1 0 0)', '#FFFFFF'],
  '--popover-foreground': ['oklch(0.205 0.012 264)', '#1D2129'],
  '--primary': ['oklch(0.54 0.24 293)', '#165DFF'],
  '--primary-foreground': ['oklch(0.99 0 0)', '#FFFFFF'],
  '--secondary': ['oklch(0.95 0.006 264)', '#F2F3F5'],
  '--secondary-foreground': ['oklch(0.265 0.014 264)', '#1D2129'],
  '--muted': ['oklch(0.935 0.006 264)', '#F2F3F5'],
  '--muted-foreground': ['oklch(0.493 0.018 264)', '#4E5969'],
  '--accent': ['oklch(0.962 0.012 278)', '#E8F3FF'],
  '--accent-foreground': ['oklch(0.34 0.105 278)', '#0E42D2'],
  '--destructive': ['oklch(0.58 0.22 27)', '#F53F3F'],
  '--destructive-foreground': ['oklch(0.99 0 0)', '#FFFFFF'],
  '--border': ['oklch(0.925 0.003 264)', '#E5E6EB'],
  '--input': ['oklch(0.84 0.01 264)', '#E5E6EB'],
  '--ring': ['oklch(0.54 0.24 293)', '#165DFF'],
  '--chart-1': ['oklch(0.54 0.24 293)', '#165DFF'],
  '--chart-2': ['oklch(0.57 0.12 196)', '#14C9C9'],
  '--chart-3': ['oklch(0.56 0.13 244)', '#00B42A'],
  '--chart-4': ['oklch(0.72 0.15 78)', '#FF7D00'],
  '--chart-5': ['oklch(0.62 0.17 19)', '#722ED1'],
  '--success': ['oklch(0.55 0.16 151)', '#00B42A'],
  '--success-foreground': ['oklch(0.99 0 0)', '#FFFFFF'],
  '--warning': ['oklch(0.7 0.15 75)', '#FF7D00'],
  '--warning-foreground': ['oklch(0.25 0.04 60)', '#1D2129'],
  '--info': ['oklch(0.58 0.14 244)', '#3491FA'],
  '--info-foreground': ['oklch(0.99 0 0)', '#FFFFFF'],
  '--sidebar': ['oklch(1 0 0)', '#FFFFFF'],
  '--sidebar-foreground': ['oklch(0.265 0.014 264)', '#4E5969'],
  '--sidebar-primary': ['oklch(0.54 0.24 293)', '#165DFF'],
  '--sidebar-primary-foreground': ['oklch(0.99 0 0)', '#FFFFFF'],
  '--sidebar-accent': ['oklch(0.962 0.012 278)', '#E8F3FF'],
  '--sidebar-accent-foreground': ['oklch(0.34 0.105 278)', '#0E42D2'],
  '--sidebar-ring': ['oklch(0.54 0.24 293)', '#165DFF'],
});
for (const values of Object.values(productLightTokenMigration)) Object.freeze(values);

export const productDarkTokenMigration = Object.freeze({
  '--background': ['oklch(0.15 0.01 264)', '#17171A'],
  '--foreground': ['oklch(0.96 0.004 264)', '#E6E6E6'],
  '--card': ['oklch(0.185 0.012 264)', '#232324'],
  '--card-foreground': ['oklch(0.96 0.004 264)', '#E6E6E6'],
  '--popover': ['oklch(0.195 0.012 264)', '#232324'],
  '--popover-foreground': ['oklch(0.96 0.004 264)', '#E6E6E6'],
  '--primary': ['oklch(0.72 0.19 293)', '#3C7EFF'],
  '--primary-foreground': ['oklch(0.16 0.02 270)', '#FFFFFF'],
  '--secondary': ['oklch(0.235 0.012 264)', '#2A2A2B'],
  '--secondary-foreground': ['oklch(0.94 0.004 264)', '#E6E6E6'],
  '--muted': ['oklch(0.235 0.012 264)', '#2A2A2B'],
  '--muted-foreground': ['oklch(0.7 0.012 264)', '#B3B3B3'],
  '--accent': ['oklch(0.245 0.035 278)', '#1B2B4A'],
  '--accent-foreground': ['oklch(0.84 0.09 278)', '#94BFFF'],
  '--destructive': ['oklch(0.68 0.19 24)', '#F76965'],
  '--destructive-foreground': ['oklch(0.98 0 0)', '#FFFFFF'],
  '--border': ['oklch(0.3 0.012 264)', '#484849'],
  '--input': ['oklch(0.335 0.014 264)', '#5F5F60'],
  '--ring': ['oklch(0.72 0.19 293)', '#3C7EFF'],
  '--chart-1': ['oklch(0.72 0.19 293)', '#3C7EFF'],
  '--chart-2': ['oklch(0.7 0.13 177)', '#14C9C9'],
  '--chart-3': ['oklch(0.72 0.13 230)', '#27C346'],
  '--chart-4': ['oklch(0.78 0.14 83)', '#FF9A2E'],
  '--chart-5': ['oklch(0.72 0.16 22)', '#A871E3'],
  '--success': ['oklch(0.68 0.15 151)', '#27C346'],
  '--success-foreground': ['oklch(0.15 0.03 151)', '#FFFFFF'],
  '--warning': ['oklch(0.8 0.14 78)', '#FF9A2E'],
  '--warning-foreground': ['oklch(0.22 0.04 60)', '#1D2129'],
  '--info': ['oklch(0.7 0.13 244)', '#57A9FB'],
  '--info-foreground': ['oklch(0.15 0.03 244)', '#FFFFFF'],
  '--sidebar': ['oklch(0.17 0.01 264)', '#17171A'],
  '--sidebar-foreground': ['oklch(0.9 0.006 264)', '#E6E6E6'],
  '--sidebar-primary': ['oklch(0.72 0.19 293)', '#3C7EFF'],
  '--sidebar-primary-foreground': ['oklch(0.16 0.02 270)', '#FFFFFF'],
  '--sidebar-accent': ['oklch(0.245 0.035 278)', '#1B2B4A'],
  '--sidebar-accent-foreground': ['oklch(0.84 0.09 278)', '#94BFFF'],
  '--sidebar-border': ['oklch(0.3 0.012 264)', '#484849'],
  '--sidebar-ring': ['oklch(0.72 0.19 293)', '#3C7EFF'],
});
for (const values of Object.values(productDarkTokenMigration)) Object.freeze(values);

// Component declarations that moved from literals to the #580 size rhythm.
const buttonDefault = ':is([data-slot="button"], .svadmin-button):is([data-size="default"], .svadmin-button-size--default), :is([data-svadmin-button], .svadmin-button):is([data-size="default"], .svadmin-button-size--default)';
const buttonSm = ':is([data-slot="button"], .svadmin-button):is([data-size="sm"], .svadmin-button-size--sm), :is([data-svadmin-button], .svadmin-button):is([data-size="sm"], .svadmin-button-size--sm)';
const buttonLg = ':is([data-slot="button"], .svadmin-button):is([data-size="lg"], .svadmin-button-size--lg), :is([data-svadmin-button], .svadmin-button):is([data-size="lg"], .svadmin-button-size--lg)';
const buttonIcon = ':is([data-slot="button"], .svadmin-button):is([data-size="icon"], .svadmin-button-size--icon), :is([data-svadmin-button], .svadmin-button):is([data-size="icon"], .svadmin-button-size--icon)';

export const productComponentSizeMigration = Object.freeze({
  ':is([data-slot="button"], .svadmin-button), :is([data-svadmin-button], .svadmin-button)': Object.freeze({
    'border-radius': Object.freeze(['var(--radius-md)', 'var(--radius-sm)']),
  }),
  '.svadmin-file-input__visual': Object.freeze({
    'border-radius': Object.freeze(['0.5rem', 'var(--radius-sm)']),
  }),
  [buttonDefault]: Object.freeze({ 'min-height': Object.freeze(['2.25rem', '2rem']) }),
  [buttonSm]: Object.freeze({ 'min-height': Object.freeze(['2rem', '1.75rem']) }),
  [buttonLg]: Object.freeze({ 'min-height': Object.freeze(['2.5rem', '2.25rem']) }),
  [buttonIcon]: Object.freeze({
    width: Object.freeze(['2.25rem', '2rem']),
    height: Object.freeze(['2.25rem', '2rem']),
  }),
  '.svadmin-input': Object.freeze({
    height: Object.freeze(['2.25rem', '2rem']),
    background: Object.freeze(['transparent', 'var(--card)']),
    'border-radius': Object.freeze(['0.5rem', 'var(--radius-sm)']),
    transition: Object.freeze([
      'border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
      'border-color var(--svadmin-motion-fast) var(--svadmin-motion-easing), box-shadow var(--svadmin-motion-fast) var(--svadmin-motion-easing), background-color var(--svadmin-motion-fast) var(--svadmin-motion-easing)',
    ]),
  }),
});
