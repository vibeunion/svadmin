# Cascader 叶节点边界

## 续接契约

- parent: `cascader-keyboard-20261021.md`；source: 用户继续企业级规范目标。
- reason: 点击与方向键尊重 isLeaf，但列生成和路径标签仍遍历残留 children。
- goal: 显式叶节点在展示、导航与提交中遵守同一终点边界。
- scope: Cascader、cascader 单文件测试、本证据和路线图。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读复核。
- non-goals: 不新增异步加载协议，不自动修改宿主受控值，不发布部署。

## 验收与状态

Given 受控路径经过带残留 children 的显式叶节点，
When 打开面板或使用右方向键，
Then 标签止于该节点、不显示后代列、不发出 onchange；
显式点击只提交截至该叶节点的路径。

Given 分支已经展开，
When 宿主将该分支标记为叶节点，
Then 后代列立即移除，不自动改写受控值或发出 onchange。

## 验证

- 新增两条用例在旧实现下均失败：标签包含残留子节点、旧后代列仍可见。
- 修复后 `bunx vitest run src/components/cascader.test.svelte.ts`：18/18。
- 使用现有 Vite fixture 启动本地服务，在 Chromium 1440x900 复核：
  `?leaf` 受控残留路径只显示一级、点击后提交 `["zhejiang"]`；运行中按
  `F9` 将已展开分支切为叶节点，后代列移除且 `onchange` 计数保持 0；
  `pageErrors: []`。该脚本使用本机缓存的 Chromium，不代表跨浏览器认证。
- `git diff --check` 通过。
- 显式叶节点场景在 Chromium 1440x900、390x844 均检查仅渲染一列，并保存截图
  `output/playwright/cascader-disabled-contract-20261021/leaf-{1440,390}-20261022.png`。
  截图生成不等于全套视觉验收；动态移除后焦点恢复与读屏仍待验证。
- Bohr 只读复核未发现必须修复问题；复核未独立运行测试。
