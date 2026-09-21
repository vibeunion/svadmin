import assert from 'node:assert/strict';
import postcss from 'postcss';

// 独立记录历史基线到升级后目标的累计差异；禁止从候选 CSS 或计算样式生成期望。
export const lightTokenMigration = Object.freeze({
  '--background': ['oklch(0.982 0.003 264)', 'oklch(0.985 0.001 264)'],
  '--secondary': ['oklch(0.965 0.004 264)', 'oklch(0.95 0.006 264)'],
  '--muted': ['oklch(0.96 0.004 264)', 'oklch(0.935 0.006 264)'],
  '--border': ['oklch(0.914 0.006 264)', 'oklch(0.925 0.003 264)'],
  '--input': ['oklch(0.88 0.008 264)', 'oklch(0.84 0.01 264)'],
  '--sidebar': ['oklch(0.995 0.001 264)', 'oklch(1 0 0)'],
  '--sidebar-border': ['oklch(0.914 0.006 264)', 'var(--border)'],
  '--svadmin-shadow-control': [
    '0 1px 2px rgb(15 23 42 / 0.05), 0 0 0 1px rgb(15 23 42 / 0.025)',
    '0 1px 2px rgb(15 23 42 / 0.04)',
  ],
  '--svadmin-shadow-surface': [
    '0 1px 2px rgb(15 23 42 / 0.035), 0 1px 3px rgb(15 23 42 / 0.025)',
    '0 1px 2px rgb(15 23 42 / 0.035)',
  ],
  '--svadmin-shadow-surface-hover': [
    '0 2px 5px rgb(15 23 42 / 0.055), 0 1px 2px rgb(15 23 42 / 0.035)',
    '0 2px 5px rgb(15 23 42 / 0.06)',
  ],
  '--svadmin-shadow-overlay': [
    '0 18px 48px rgb(15 23 42 / 0.14), 0 4px 12px rgb(15 23 42 / 0.08)',
    '0 20px 52px rgb(15 23 42 / 0.18), 0 6px 16px rgb(15 23 42 / 0.1)',
  ],
});
for (const values of Object.values(lightTokenMigration)) Object.freeze(values);

export function createMigrationReference(baselineCss) {
  const root = postcss.parse(baselineCss);
  for (const [property, [before, after]] of Object.entries(lightTokenMigration)) {
    const matches = [];
    root.walkDecls(property, declaration => {
      const rule = declaration.parent;
      const layer = rule?.parent;
      if (rule?.type === 'rule' && rule.selector === ':root' &&
        layer?.type === 'atrule' && layer.name === 'layer' && layer.params === 'base' &&
        layer.parent === root) matches.push(declaration);
    });
    assert.equal(matches.length, 1, `${property}: expected one historical base :root declaration`);
    assert.equal(matches[0].value, before, `${property}: historical token drift`);
    assert.equal(Boolean(matches[0].important), false, `${property}: unexpected priority`);
    matches[0].value = after;
  }
  return root.toString();
}
