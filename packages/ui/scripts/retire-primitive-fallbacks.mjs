// 旧语义类仍服务于未迁移的消费者；带新 recipe 的实例不再从旧组件规则获得样式。
const replacements = [
  [':is([data-slot="button"], .svadmin-button)', '.svadmin-ui-button'],
  [':is([data-svadmin-button], .svadmin-button)', '.svadmin-ui-button'],
  [':is([data-slot="badge"], .svadmin-badge).svadmin-badge', '.svadmin-ui-badge'],
];
const standalone = new Map([
  ['svadmin-file-input', 'svadmin-ui-input__root'],
  ['svadmin-file-input__visual', 'svadmin-ui-input__visual'],
  ['svadmin-file-input__button', 'svadmin-ui-input__button'],
  ['svadmin-file-input__name', 'svadmin-ui-input__name'],
  ['svadmin-input', 'svadmin-ui-input__control'],
  ['svadmin-textarea', 'svadmin-ui-textarea'],
]);

/** 只收窄 components 层内的旧基础样式，不改共享主题、焦点层、旧源码快照。 */
export function retirePrimitiveFallbacks(root) {
  root.walkRules(rule => {
    let inComponents = false;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'layer' && parent.params === 'components') inComponents = true;
    }
    if (!inComponents) return;
    let selector = rule.selector;
    for (const [legacy, recipe] of replacements) {
      const guard = `:not(:where(${recipe}))`;
      selector = selector.split(legacy).map((part, index) => index > 0 && !part.startsWith(guard) ? guard + part : part).join(legacy);
    }
    selector = selector.replace(/\.(svadmin-file-input(?:__(?:visual|button|name))?|svadmin-input|svadmin-textarea)(?![\w-])/g, (match, name, offset, text) => {
      const guard = `:not(:where(.${standalone.get(name)}))`;
      return text.slice(offset + match.length).startsWith(guard) ? match : match + guard;
    });
    rule.selector = selector;
  });
  return root;
}
