# MultiTabKeepAlive 标签状态恢复契约

## 续接约定

- parent: `enterprise-ui-acceptance-matrix-20261022.md` B3-09；source: 用户继续 B3-09
  多标签工作区的路由/查询/草稿/滚动恢复。
- reason: 上一轮只完成关闭保护；组件没有真实路由容器可接入，也没有类型化的
  查询/滚动/草稿快照契约，无法安全验证“切换标签保留状态”和“旧状态不串租户/标签”。
- goal: 提供显式、可注入、可验证的 `WorkspaceTabState` 适配器，并用真实
  `MultiTabKeepAlive` 消费者宿主验证切换、草稿关闭保护、刷新恢复、作用域隔离和卸载清理。
- scope: 新增 `packages/ui/src/components/workspace-tab-state.ts`、
  `workspace-tab-state.test-host.svelte`、`workspace-tab-state.test.svelte.ts`，并在
  `packages/ui/src/index.ts` 导出；不修改现有标签栏关闭语义。
- non-goals: 不把 `MultiTabKeepAlive` 改造成路由框架；不接入真实路由/Provider；不实现
  `maxTabs`/LRU 淘汰；不提供默认 `localStorage` 写入、跨标签页同步、服务端持久化或
  草稿内容存储；不改 Lite 组件。
- risk/orchestration: **medium / managed**；pi 为唯一 writer，主线程独立 verifier；
  未提交、未推送、未部署。

## 产品与契约决策

组件仍只拥有标签栏与关闭保护。真实工作区容器拥有路由、查询、滚动和草稿；适配器只保存
消费者显式提交的快照，不读取 DOM、不推断业务草稿、不自动写浏览器存储。

`createWorkspaceTabStateAdapter({ tenantId, storage? })` 的契约：

- `capture(tab, state)`：按“租户 + 标签 id”保存查询、滚动和草稿标记；未提供的字段沿用
  已有快照或默认值，查询串统一去掉开头 `?`，滚动值规范为非负整数。
- `restore(tab)`：只有租户、标签 id 和 `path` 都匹配才返回快照；同 id 换路由不会串状态。
- `markDraft` / `hasDraft`：消费方显式声明草稿；真实宿主用它实现 `onbeforeclose`。
- `clear({ id })`：标签关闭后移除内存快照并返回 `{ memoryCleared, storage }`。storage
  删除失败时同一实例用 tombstone 阻止回读；`storage: 'failed'` 明确表示新实例仍可能读到
  旧快照，调用方不能据此声称持久化已删除。
- `dispose()`：卸载时只释放内存快照，不删除持久化数据；持久化生命周期归 storage 所有者。
- `storage` 可选。传入 `sessionStorage` 等实现即可跨刷新恢复；默认仅内存保存。持久化快照
  必须包含完整版本化信封，并严格校验租户、标签 id、path 以及 query/scroll/draft 的值类型；
  负数、非有限滚动值、对象 query、字符串 draft 等脏值一律按无快照处理，不用 normalize
  洗成“安全”状态。非法 JSON、版本不符或作用域不匹配同样按未保存处理。

淘汰仍是非目标：产品尚未给出标签数量上限、固定标签优先级和 LRU 规则，不能凭组件实现猜测。

## 红测与修复

新增真实消费者宿主：宿主绑定真实 `MultiTabKeepAlive`，在切换前保存当前标签、切换后恢复
目标标签，并在 `onbeforeclose` 中查询适配器草稿。测试未 mock 标签栏组件。

首轮红测：`bunx vitest run src/components/workspace-tab-state.test.svelte.ts` →
`1 failed / 0 test`，失败原因是适配器模块尚不存在，导入无法解析；确认测试先于实现。

实现后首轮 **5 passed / 1 failed**：损坏持久化用例复用了已有内存快照，未验证“刷新后读取
损坏 storage”的路径。测试改为在篡改 storage 后新建适配器，复跑 **6/6 passed**。

为确认隔离用例确实能捕获缺陷，临时去掉 `currentEntry` 的 path 校验并只执行过滤用例：
**1 failed / 5 skipped**（同 id 新 path 仍返回旧查询）；恢复校验后重新达到 **6/6**。

主线程独立复核 6/6 后审查不通过：持久化读取把脏字段归一化为合法快照、clear 在 removeItem
抛错后可被同实例回读、真实宿主既不在初始挂载恢复也不在卸载前保存。按同一单文件先加 5 条
反例：严格信封/值类型、clear 失败 tombstone 与显式返回值、真实宿主首次挂载恢复、未切标签
修改在卸载前保存并由新宿主恢复、关闭当前标签后 select/unmount 不重建快照。红测
**4 failed / 7 passed（11）**；修复后 **11/11 passed**。

覆盖用例：

1. 真实标签栏切换 Orders → Mail → Orders，查询串和滚动位置按标签恢复，Mail 自己的查询
   不覆盖 Orders。
2. 适配器标记草稿后点击真实关闭按钮被 `onbeforeclose` 拒绝；标记清理后同一按钮可关闭。
3. 新建适配器从同一 storage 恢复版本化快照，草稿标记仍生效。
4. 同 id 不同租户、同租户不同 path、不同标签 id 均不共享旧状态。
5. 损坏 JSON 和版本不符的持久化快照被忽略且不抛错。
6. `clear` 只移除目标标签；宿主卸载触发 `dispose` 后内存快照不可恢复，持久化 storage
   不被卸载逻辑删除。
7. 持久化信封中的 `draft: "true"`、`draft: 1`、对象 query、负/无限/字符串 scroll 均被
   拒绝，不会归一化成合法快照而抹掉草稿保护。
8. `removeItem` 抛错时 clear 返回 `{ memoryCleared: true, storage: 'failed' }`，同一实例
   因 tombstone 不再回读；新实例仍可读到旧快照的边界被测试明确记录。
9. 真实宿主首次挂载即从 storage 恢复 active 标签的查询和滚动，不依赖标签切换。
10. 未切换标签的查询/滚动修改在卸载前 capture，新适配器 + 新宿主同 scope 可从 storage
    恢复。
11. 关闭当前标签后，select 回调和 onDestroy 都不会重建该标签快照；同一实例和新实例都
    读不到已关闭标签。

## 验收结果

执行（严格单文件）：

`cd packages/ui && bunx vitest run src/components/workspace-tab-state.test.svelte.ts`
→ **11/11 passed**。

`git diff --check` 针对本次改动通过；新增文件另按无索引 diff 检查空白错误。未运行全仓测试、
未执行发布构建、未接入真实浏览器路由或真实后端存储。

## 真实浏览器 fixture 验收（desktop / narrow）

为补足组件单测无法覆盖的浏览器事件与真实标签栏挂载，新增专属 fixture 和配置：

- fixture：`scripts/fixtures/enterprise-ui/MultiTabStateBrowserFixture.svelte`，直接挂载真实
  `MultiTabKeepAlive` 和 `createWorkspaceTabStateAdapter`，未 mock 组件。
- spec：`scripts/fixtures/enterprise-ui/multitab-state.spec.ts`；配置：
  `scripts/fixtures/enterprise-ui/playwright.multitab-state.config.ts`；入口
  `/?view=multi-tab-state`。
- 注入 storage 是**受控 session storage**：fixture 用 `b3-09-fixture:` 前缀包裹
  `window.sessionStorage`，只验证适配器契约，不读写产品 storage 键，也不代表生产选型。

覆盖流程：Orders 写入查询/滚动 → 切 Mail 写入另一组 → 切 Invoice draft 写入快照 →
切回 Orders / Mail 各自恢复且不串；冻结标签数组与标签对象后点击真实
`Close Invoice draft` 仍被草稿保护拦截；清除草稿标记后同一入口关闭，并删除受控
session storage 中的该标签快照；重开同 id 标签得到空查询和 `scrollTop=0`，Orders / Mail
旧快照仍独立保留。截图保存于
`output/playwright/multitab-state-browser-20261022/`：
`chromium-desktop-draft-protected.png`、`chromium-desktop-reopened-invoice.png`、
`chromium-narrow-draft-protected.png`、`chromium-narrow-reopened-invoice.png`。

先红后绿：临时把 fixture 的 `onbeforeclose` 改成始终放行，同一专属配置执行
**2 failed / 2**（desktop、narrow 都在草稿关闭保护断言失败）；恢复真实
`handleBeforeClose` 后复跑 **2/2 passed**、exit `0`、`2.8s`（desktop 2.1s、narrow 2.0s）。
同时复跑相关单测
`cd packages/ui && bunx vitest run src/components/workspace-tab-state.test.svelte.ts`
→ **11/11 passed**、exit `0`、`6.35s`。`git diff --check` exit `0`。

主线程随后独立复跑同一浏览器配置：Chromium desktop/narrow **2/2 passed**、exit `0`、
`3.0s`；状态适配器单文件独立复跑 **11/11 passed**、`7.36s`；`git diff --check`
仍通过。pi 与主线程结果分开记录。

该验收只证明本地受控 fixture 中的浏览器行为，不证明真实产品路由、真实 Provider、
浏览器前进后退、跨标签页同步、生产 storage 选型或后端状态已完成。

## 未验收边界
- 真实产品路由接入、Provider/查询缓存协同、浏览器前进后退和跨标签页恢复未验证。
- 真实滚动容器性能、长列表虚拟化、内存占用和淘汰未验证。
- 持久化仅验证注入式 storage 契约；未指定生产使用 `sessionStorage` 还是服务端快照，也未
  验证配额、隐私模式和跨浏览器差异。
- clear 的 `storage: 'failed'` 只保证当前实例 tombstone；由于浏览器 storage 删除可能失败，
  新实例仍可能回读旧快照。调用方必须处理该返回值，不能把内存清理等同于持久化删除。
- 草稿只保存布尔标记，不保存草稿正文；草稿布尔标记不等于正文恢复。关闭确认 UI 和正文
  持久化仍由消费方提供。
- `maxTabs`/LRU/固定标签优先级仍缺产品规则，未实现，不能宣称淘汰完成。
- Lite 组件未同步该适配器；关闭保护与状态恢复的 1:1 对齐未复核。
- 未做读屏、跨浏览器完整矩阵和发布验收。
