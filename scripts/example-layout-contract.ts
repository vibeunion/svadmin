import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

type Requirement = { label: string; className: string; property: string; value: string; desktop?: boolean };

const requirements: Requirement[] = [
  { label: 'expanded sidebar width', className: 'svadmin-sidebar--expanded', property: 'width', value: '252px' },
  { label: 'collapsed sidebar width', className: 'svadmin-sidebar--collapsed', property: 'width', value: '70px' },
  ...['sidebar-content-expanded', 'sidebar-content-collapsed'].flatMap(className => [
    { label: `${className} mobile start offset`, className, property: 'margin-inline-start', value: '0' },
    { label: `${className} mobile end offset`, className, property: 'margin-inline-end', value: '0' },
  ]),
  { label: 'expanded desktop content offset', className: 'sidebar-content-expanded', property: 'margin-inline-start', value: '252px', desktop: true },
  { label: 'collapsed desktop content offset', className: 'sidebar-content-collapsed', property: 'margin-inline-start', value: '70px', desktop: true },
  // Stable public alias used by existing table wrappers; spelling is not a utility language.
  { label: 'table container radius', className: 'svadmin-u-5f22e64f2282', property: 'border-radius', value: 'var(--radius-lg)' },
];

/** Verify actual emitted declarations, not merely old utility-language selector names. */
export function assertExampleLayoutCss(css: string): void {
  const found = new Set<Requirement>();
  postcss.parse(css).walkRules(rule => {
    const classes = new Set<string>();
    selectorParser(selectors => {
      selectors.each(selector => {
        // A qualified/descendant/conditional selector is not an unconditional state rule.
        if (selector.nodes.length === 1 && selector.first?.type === 'class') classes.add(selector.first.value);
      });
    }).processSync(rule.selector);
    const conditions: string[] = [];
    for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type !== 'atrule' || parent.name === 'layer') continue;
      conditions.push(`@${parent.name} ${parent.params.replace(/\s+/g, '')}`);
    }
    for (const required of requirements) {
      if (!classes.has(required.className)) continue;
      const expected = required.desktop ? ['@media (min-width:48rem)', '@media (min-width:768px)'] : [];
      if (required.desktop ? conditions.length !== 1 || !expected.includes(conditions[0] ?? '') : conditions.length !== 0) continue;
      for (const node of rule.nodes) {
        if (node.type !== 'decl') continue;
        const value = node.value.trim().replace(/^0px$/, '0');
        if (node.prop === required.property && value === required.value && !node.important) found.add(required);
        if (required.property.startsWith('margin-inline-') && node.prop === 'margin-inline' && value === required.value && !node.important) found.add(required);
      }
    }
  });
  const missing = requirements.filter(required => !found.has(required));
  if (missing.length) throw new Error(`Example CSS is missing native layout declarations: ${missing.map(r => r.label).join(', ')}`);
}
