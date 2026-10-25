# TreeSelect onlyLeafSelectable 边界

## 续接约定

- parent：`tree-select-outside-focus-20261022.md`；source：用户继续完善企业级规范。
- reason：onlyLeaf 的禁用传播与不可解析父项边界缺少直接回归证据。
- goal：证明祖先 disabled 不能经搜索匹配后代提交，且没有 `loadChildren` 的
  `hasChildren` 父项不会被当成叶子提交；single/multiple 各覆盖。
- scope：`packages/ui/src/components/tree-select.test.svelte.ts`、本证据、路线图
  B2-06 段；本轮 B2-06 续接另改专属 `TreeSelectFixture.svelte` 与
  `tree-select.spec.ts`。
- risk/orchestration：low / managed；pi 执行，主线程审查，仓库唯一写入者。
- non-goals：不改 `TreeSelect.svelte` 及任何其他生产代码，不扩展安全检查、
  Provider 协议、样式或发布范围。

## 实现事实（读取现有生产组件，未修改）

- `disabledValues` 由完整 `options` 树派生并沿父子链继承，`filterTree` 只裁剪
  显示集合，因此搜索命中的后代仍带祖先禁用。
- `handleSelect` 先检查 `disabled || disabledValues.has(value)`，命中即返回，
  不写 `value`、不触发 `onchange`。
- onlyLeaf 模式下 `hasChildren` 父项只走展开路径；`ensureChildren` 在没有
  `loadChildren` 时返回 `false`，展开与提交都停止。

## 新增验收场景（本轮 4 项）

1. Given 祖先 `disabled`、后代标签被搜索命中，When 指针点击、Enter、Space，
   Then 不提交、后代 `aria-disabled=true`；同一搜索边界下未继承禁用的叶子
   仍恰好提交一次。覆盖 multiple=false/true。
2. Given 某节点 `hasChildren: true` 且未提供 `loadChildren`，When 指针点击、
   Enter、Space 或点击展开按钮，Then 不提交、`aria-expanded` 保持 false；
   同层的普通叶子仍可提交。覆盖 multiple=false/true。

## B2-06 三态组合只读复核（本轮）

- 只读复核 `TreeSelect.svelte`、单文件测试、专属 fixture/spec 后，没有发现
  onlyLeaf 下 retry/empty/disabled 的生产行为缺口；本轮未修改生产代码。
- 已有断言分别覆盖 lazy retry、空结果转叶子、禁用祖先/节点；缺的是把三者
  串成同一条状态路径的直接回归，以及 onlyLeaf 专属浏览器证据。
- 组件级新增：首次加载失败 -> 禁用清除错误且拒绝提交 -> 重试返回空结果，
  父项转为可提交叶子；multiple=false/true 均只提交一次。另一用例证明禁用期间
  结算的旧空结果会退休，重新启用后不会把未重试分支误当叶子。
- 浏览器新增：onlyLeaf + empty fixture 先失败、键盘 Enter 重试、空结果转叶子，
  再切换组件 disabled 验证不提交，恢复后 Space 恰好提交 `["sales"]`。

## 验证记录

- `packages/ui`：`bun run test src/components/tree-select.test.svelte.ts`，
  **135/135**，退出 0（本轮新增 3 项三态组合回归；此前记录的 118/118 为
  历史基线）。
- `scripts/fixtures/enterprise-ui`：TreeSelect 专属配置 `-g "leaf-only"`，
  Chromium/WebKit/Firefox × 1440x1000/390x844，**18/18**，退出 0；其中新增
  三态浏览器场景 **6/6**，既有 onlyLeaf 场景 **12/12**。
- `git diff --check`：退出 0。
- 本轮重跑 TreeSelect 完整专属浏览器配置：三引擎两视口 **96/96**，退出 0。

### 主线程独立复核

- 上述 135/135、18/18 与完整配置 96/96 为 pi 执行结果，不合并为主线程结果。
- 主线程使用 UI Vitest 配置运行 `src/components/tree-select.test.svelte.ts`：
  **135/135 passed、exit 0、12.09s**。
- 主线程运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.tree-select.config.ts -g 'leaf-only' --trace retain-on-failure --output output/playwright/tree-select-leaf-review-20261023`：
  **18/18 passed、exit 0、18.5s**；未独立重跑完整 96 项配置。
- `git diff --check`：exit 0。浏览器状态切换通过 fixture 控制，选择操作使用
  真实键盘；它不证明真实 Provider、权限或读屏行为。

## 未验证边界

- 浏览器只新增一个 multiple 的三态路径；single 的三态组合由组件级用例覆盖，
  未单独做跨引擎浏览器矩阵。
- 未验证宿主未使用 `bind:options` 时，在组件内部替换 options 后继续原地修改
  同一外部数组的传播语义；这是 bindable prop 的宿主契约边界，本轮不将其
  计为 onlyLeaf 三态生产缺口，也未改生产代码。
- 未针对 `hasChildren` 无 loader 的父项做产品决策：当前实现让它在 onlyLeaf
  下既不可选也不可展开（数据无法解析出叶子），因此是显式死端；如需回退为
  可选或提示，需要单独的需求确认，本轮不改生产行为。
- 未发布、未接入真实 Provider、未做真实屏幕阅读器认证；不声称 onlyLeaf
  的全部排列或整体企业级目标已完成。
