import { createHash } from 'node:crypto';

// 迁移时冻结的生成资产，不是手写页面。路径和字节必须同时匹配，不能泛化豁免 CSS。
const frozenAssets = new Map([
  ['example/test/style-baselines/utilities.css', '853e72b535d280770a9d64d92f2a29b8cfe1cd315a0be4a66a85b971e86b094f'],
  ['packages/ai-elements/test/style-baselines/utilities.css', 'c5232f52698d61177848f4b0c61033a70b102505666c25908dab9fcea73d45d7'],
]);

export function isFrozenCompatibilityCss(path: string, source: string): boolean {
  const expected = frozenAssets.get(path.replaceAll('\\', '/'));
  if (expected === undefined) return false;
  const actual = createHash('sha256').update(source).digest('hex');
  if (actual !== expected) {
    throw new Error(`${path}: frozen compatibility CSS changed; review its source and visual baseline explicitly`);
  }
  return true;
}
