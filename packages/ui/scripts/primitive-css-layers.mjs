import postcss from 'postcss';

export const primitiveClass = /\.svadmin-ui-(?:button|badge|input|textarea)(?=[\s.\[:#>+~_-]|$)/;

/** 基础组件保留 components 层；Surface 的增强 recipes 仍然是非分层规则。 */
export function layerPrimitiveRecipes(root) {
  const owned = [];
  root.walkRules((rule) => {
    if (!primitiveClass.test(rule.selector)) return;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'layer' && parent.params === 'components') return;
      if (parent.type === 'rule' && primitiveClass.test(parent.selector)) return;
    }
    owned.push(rule);
  });
  for (const rule of owned) {
    const layer = postcss.atRule({ name: 'layer', params: 'components' });
    rule.replaceWith(layer);
    layer.append(rule);
  }
  // 仅合并相邻同名层；不跨越条件、其他规则或改变声明先后顺序。
  root.walkAtRules('layer', (rule) => {
    const previous = rule.prev();
    if (rule.params === 'components' && previous?.type === 'atrule' && previous.name === 'layer' && previous.params === rule.params) {
      previous.append(...rule.nodes);
      rule.remove();
    }
  });
  return root;
}
