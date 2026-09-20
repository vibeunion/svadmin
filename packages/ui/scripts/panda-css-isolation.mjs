import assert from 'node:assert/strict';

/** Remove only unused, unprefixed Panda initializers; fail rather than discard a used value. */
export function isolatePandaCss(root) {
  const removable = [];
  const references = new Set();
  root.walkDecls((decl) => {
    for (const match of decl.value.matchAll(/var\(\s*(--[\w-]+)/g)) references.add(match[1]);
    if (decl.prop.startsWith('--') && !decl.prop.startsWith('--svadmin-')) removable.push(decl);
  });
  for (const decl of removable) {
    assert.ok(!references.has(decl.prop), `Unprefixed Panda variable needs an explicit isolation strategy: ${decl.prop}`);
    decl.remove();
  }
  root.walkRules((rule) => {
    if (!rule.nodes?.length) rule.remove();
  });
  return root;
}
