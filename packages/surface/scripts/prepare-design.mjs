import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

// 只在仓库构建阶段复制生成物；发布的 Surface 不依赖 UI 的新增导出入口，
// 不要求消费者安装 Panda，也不改变既有 minimum-supported peer 范围。
const uiRoot = new URL('../../ui/', import.meta.url);
const source = new URL('src/styled-system/', uiRoot);
const destination = new URL('../src/styled-system/', import.meta.url);
const css = new URL('src/styles/recipes.css', uiRoot);
if (!existsSync(new URL('recipes/index.js', source)) || !existsSync(css)) {
  throw new Error('Build @svadmin/ui styles before @svadmin/surface: bun run --cwd packages/ui build:styles');
}
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
writeFileSync(new URL('design-contract.ts', destination), readFileSync(new URL('src/design-contract.ts', uiRoot)));
writeFileSync(new URL('../src/styles.css', import.meta.url), readFileSync(css));
