import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

type Requirement = {
  label: string; className: string; property: string; value: string;
  viewport?: 'mobile' | 'desktop'; rtl?: boolean;
};

const requirements: Requirement[] = [
  ...(['expanded', 'collapsed'] as const).flatMap((state): Requirement[] => {
    const className = `svadmin-sidebar-content-${state}`;
    const value = state === 'expanded' ? '252px' : '70px';
    return [
      { label: `${state} sidebar width binding`, className: `svadmin-sidebar-${state}`, property: 'width', value: 'var(--svadmin-sidebar-width)' },
      { label: `${state} sidebar width`, className: `svadmin-sidebar-${state}`, property: '--svadmin-sidebar-width', value },
      { label: `${state} desktop content offset`, className, property: 'margin-left', value, viewport: 'desktop' },
      { label: `${state} RTL left reset`, className, property: 'margin-left', value: '0', viewport: 'desktop', rtl: true },
      { label: `${state} RTL right offset`, className, property: 'margin-right', value, viewport: 'desktop', rtl: true },
      ...[className, `sidebar-content-${state}`].flatMap((mobileClass): Requirement[] =>
        ['margin-left', 'margin-right'].map(property => ({
          label: `${mobileClass} mobile ${property}`, className: mobileClass, property, value: '0', viewport: 'mobile',
        }))),
    ];
  }),
  // Stable public alias used by existing table wrappers; spelling is not a utility language.
  { label: 'table container radius', className: 'svadmin-u-5f22e64f2282', property: 'border-radius', value: 'var(--radius-lg)' },
];

/** Verify actual emitted declarations, not merely old utility-language selector names. */
export function assertExampleLayoutCss(css: string): void {
  const found = new Set<Requirement>();
  postcss.parse(css).walkRules(rule => {
    const classes = new Set<string>();
    const rtlClasses = new Set<string>();
    selectorParser(selectors => {
      selectors.each(selector => {
        // A qualified/descendant/conditional selector is not an unconditional state rule.
        if (selector.nodes.length === 1 && selector.first?.type === 'class') classes.add(selector.first.value);
        const [direction, descendant, state] = selector.nodes;
        if (selector.nodes.length === 3 && direction?.type === 'attribute' &&
          direction.attribute === 'dir' && direction.operator === '=' && direction.value === 'rtl' &&
          !direction.insensitive && descendant?.type === 'combinator' && descendant.value.trim() === '' &&
          state?.type === 'class') rtlClasses.add(state.value);
      });
    }).processSync(rule.selector);
    const conditions: string[] = [];
    for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'layer') continue;
      if (parent.type !== 'atrule') { conditions.push('nested-selector'); continue; }
      conditions.push(`@${parent.name} ${parent.params.replace(/\s+/g, '')}`);
    }
    for (const required of requirements) {
      if (!(required.rtl ? rtlClasses : classes).has(required.className)) continue;
      const expected = required.viewport === 'desktop' ? ['@media (min-width:48rem)', '@media (min-width:768px)']
        : ['@media (max-width:47.9375rem)', '@media (max-width:767px)'];
      if (required.viewport ? conditions.length !== 1 || !expected.includes(conditions[0] ?? '') : conditions.length !== 0) continue;
      for (const node of rule.nodes) {
        if (node.type !== 'decl') continue;
        const value = node.value.trim().replace(/^0px$/, '0');
        if (node.prop === required.property && value === required.value && !node.important) found.add(required);
      }
    }
  });
  const missing = requirements.filter(required => !found.has(required));
  if (missing.length) throw new Error(`Example CSS is missing native layout declarations: ${missing.map(r => r.label).join(', ')}`);
}
