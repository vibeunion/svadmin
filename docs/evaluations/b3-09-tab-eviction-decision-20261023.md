# B3-09 多标签淘汰策略决策记录

## 2026-10-24 成功清理的共享标记复核

- pi 曾尝试在持久化删除成功后立即删除共享关闭标记；主线程审查否决。
  该标记还用于阻断同一 storage 对象上其它 adapter 已缓存的旧内存快照，
  不能仅因 storage 已删除而直接释放。
- 反例：writer 保存旧状态，reader 恢复并缓存，writer 成功 clear 后，
  reader.restore 必须为 undefined，reader.hasDraft 必须为 false。
  在尝试删除共享标记的实现下，该反例失败（1 failed / 21 passed）。
- pi 已仅撤回本轮尝试的实现变更及改变契约的测试，保留上述回归用例；
  原有 dirty 修改未撤回。生产实现恢复本轮开始时的行为。
- 主线程独立执行 workspace-tab-state.test.svelte.ts：21/21，exit 0，6.06s。
  本轮不重复浏览器或分发检查，不宣称资源保留问题已解决。
- 长期存储对象下的标记保留是待评估的资源边界；若要优化，必须同时保证
  已缓存 adapter 的失效语义，不能再次采用“成功 clear 后直接删标记”的方案。
  本轮未新增草稿内容持久化接口，产品决策阻塞不变。

## 当前状态

截至 2026-10-24，本地 LRU 与受控消费者验证已完成：主线程独立回归为淘汰单测
**37/37**、关闭保护 **29/29**、浏览器矩阵 **24/24**。下文早期的“尚未实现”
和“推荐契约”为历史决策输入，已由后续授权实现取代；以“最终消费者验证”节为准。

`MultiTabKeepAlive` 已覆盖标签选择、关闭保护、固定标签、批量关闭和刷新入口。
`createWorkspaceTabStateAdapter` 已覆盖租户/标签/path 隔离、查询/滚动/草稿快照、
持久化读取校验和关闭清理边界。跨实例关闭清理续修后，writer 本地直接回归
`workspace-tab-state.test.svelte.ts` 为 **20/20**（上一轮为 16/16）；主线程独立复核结果以本轮审查
结论为准。此前主线程直接回归为：

- `workspace-tab-state.test.svelte.ts`：13/13
- `multitab-close-protection.test.svelte.ts`：28/28

历史结果保留为：`workspace-tab-state.test.svelte.ts` 11/11、
`multitab-close-protection.test.svelte.ts` 23/23、浏览器 **6/6**，不冒充当前结果。
当前结果仍不证明真实产品路由、Provider/查询缓存协同、生产 storage 选型或跨标签
浏览器恢复。

当前 DOM 已将关闭按钮调整为 tab 的独立兄弟操作，并为 tab 增加明确名称和关闭动作
描述；外层右键操作容器使用 presentation 语义。历史复核为关闭保护单测 **23/23**
和 Chromium/WebKit/Firefox × desktop/narrow 浏览器 **6/6**。2026-10-24 的当前增量
复核见下文：关闭保护 **28/28**、真实浏览器键盘路径 **12/12**。这些结果仍不等于
屏幕阅读器实机认证，也不覆盖淘汰策略、真实路由或 Provider。

## 2026-10-24 跨实例关闭清理契约

主线程最终独立验证：`workspace-tab-state.test.svelte.ts` **20/20**，
exit 0，8.54s；实现文件完整严格 TypeScript 检查 **0 diagnostics**，
含 exactOptionalPropertyTypes、noUncheckedIndexedAccess、
noPropertyAccessFromIndexSignature、skipLibCheck:false；定向 ESLint/diff 通过。
独立重放删除和写入均失败、随后 capture 的链路：本地读 `new`，
新 adapter 读 `undefined`，不再暴露旧的 `old`。UI build exit 0 后工作区专属
浏览器 **24/24（2.5m）**，验证正常消费路径未回归；存储失败分支的直接证据仍为
上述单文件测试，不称为浏览器故障注入结果。未提交、推送或部署。

本轮仅修复 `workspace-tab-state` 的跨 adapter 实例清理缺口；`pi` 是唯一代码
writer，managed low，主线程独立审查。只修改 `workspace-tab-state.ts`、其单测和
本决策记录，保留工作区全部既有 dirty 状态，未提交、推送或部署，未运行全仓测试。

### 最小安全契约

- `clear` 只有在 `removeItem` 不抛错且随后 `getItem` 确实读不到旧值时才返回
  `storage: 'cleared'`。`removeItem` 抛错、或返回成功但仍能读到旧值，都按
  `failed` 报告，不把“未真正删除”冒充清理成功。
- `failed` 时适配器写入只含 `version/tenantId/tabId/closed` 的关闭信封，并同时在
  模块级 `WeakMap` 中按 storage 对象记录关闭键。新 adapter 读取到关闭信封或共享
  关闭键时 `restore`/`hasDraft` 返回不可用（`undefined`/`false`），不会恢复旧快照。
- `capture` 或 `markDraft` 重新打开同 id/path 时先让本地新内存快照可用，但不会
  无条件退休共享关闭标记：只有新信封写入后回读一致，才移除共享关闭标记；写入
  抛错或 `setItem` 静默 no-op 时继续保留跨实例阻断。因此失败清理后的显式接管在
  当前实例可读新内存，而新的 adapter 不会在持久化成功前恢复旧快照。
- 若 storage 连关闭信封也无法写入，`clear` 仍明确返回 `failed`；同一运行时的共享
  关闭键继续保护同 storage 对象的新 adapter，但刷新或跨运行时的新实例仍可能读到
  旧的合法快照。这是 storage 完全不可写入时的残余边界，调用方不能据此声称删除成功。

### 红测与绿灯

- 上一轮先写红测后修复前：`workspace-tab-state.test.svelte.ts` 为
  **3 failed / 13 passed（共 16）**，失败为 removeItem 失败后新 adapter 恢复旧
  快照、removeItem 未真正删除却返回 `cleared`、失败清理后新 adapter 仍恢复旧快照
  而非等待重新 capture。
- 本轮续修先补 4 个红测后修复前：**2 failed / 18 passed（共 20）**，失败为失败
  清理后本地 recapture 过早退休共享阻断、以及 `setItem` 静默 no-op 时旧快照
  重新暴露给新 adapter。
- 修复后同一单文件 **20/20**；`workspace-tab-state.ts` 定向 ESLint 无错误；
  `git diff --check` 无输出；实现文件独立严格 `tsc --noEmit --strict` 通过。
- 单测文件仍有 3 个既有非空断言 ESLint 错误，不把该文件宣称为全文件 lint 通过；
  未运行全仓测试、浏览器矩阵、真实 storage、真实路由/Provider 或发布验收。

## 2026-10-24 增量：键盘导航、浏览器路径与存储失败覆盖

本轮已由主线程独立验证以下本地实现，未提交、未发布、未部署：

- `MultiTabKeepAlive` 已实现唯一 `roving tabindex`、ArrowLeft/ArrowRight 循环移动、
  Home/End 跳转，以及当前激活项无匹配时回退到第一个可达 tab；未改变关闭保护、
  公开 API 或淘汰策略。关闭保护单测当前 **28/28** 通过。
- 真实浏览器键盘路径为 Chromium/WebKit/Firefox × desktop/narrow **12/12** 通过，
  即历史 6 个场景加新增 6 个场景；不能把 12/12 全部算作新增。
- `workspace-tab-state.ts` 已修复同 id 内存快照优先：同一标签 id 已有内存快照但
  `path` 不匹配时直接返回无快照，不再回读旧 storage 并用旧路径覆盖当前内存。
  `workspace-tab-state.test.svelte.ts` 当前 **13/13** 通过。

上述增量只关闭本地键盘可达性与存储写入失败场景的覆盖缺口，不改变以下未验收边界：
淘汰策略仍未定义，真实路由、Provider/查询缓存协同、生产 storage 选型、读屏实机
和发布均未验收。新适配器仍可能回读旧的合法持久化快照；内存修复不等于持久化修复。

## 尚未实现的策略

仓库当前没有公开以下契约，因此不能直接实现并宣称企业级完成：

1. 标签数量上限：全局上限、每租户上限，还是每工作区上限。
2. 淘汰触发点：打开新标签时、路由切换时，还是内存压力时。
3. 淘汰顺序：LRU、最近访问、最早打开，还是按标签类型优先级。
4. 固定标签行为：固定标签是否计入上限，达到上限时是否拒绝新标签。
5. 脏标签行为：有草稿时拒绝淘汰、进入确认流程，还是允许只淘汰内存视图并保留快照。
6. 持久化范围：仅 session storage、跨刷新恢复，还是跨浏览器标签页同步。
7. 路由协同：淘汰后是否清理 URL、查询缓存、详情抽屉和未完成请求。

## 推荐的最小默认契约

若产品确认纳入本轮，建议先采用以下可验证默认值：

- `maxTabs` 由宿主显式传入，不提供隐式全局默认值。
- 固定标签不计入可淘汰额度，且永不自动淘汰。
- 非固定标签按最近访问时间 LRU 淘汰。
- 当前活动标签和 `dirty=true` 标签不得自动淘汰。
- 只有存在可淘汰标签时才打开新标签；否则由宿主收到明确的
  `onTabLimitReached` 回调并决定提示或拒绝。
- 淘汰只负责标签集合与快照清理；路由、查询取消和业务持久化由宿主显式协同。
- `storage` 仍由宿主注入，组件不直接选择生产存储。

## 后续验收门槛

产品确认上述策略后，另立实现任务，至少覆盖：

- `maxTabs`、固定标签、活动标签和 dirty 标签的组合矩阵；
- LRU 顺序在选择、刷新、路由恢复后的稳定性；
- 淘汰后 query/scroll/draft 快照不会串租户或串 path；
- 宿主收到 limit/eviction 回调且 URL 与 Provider 状态由宿主处理；
- Chromium/WebKit/Firefox 的桌面与窄屏路径；
- 真实产品路由、Provider、生产 storage 和屏幕阅读器验收。

在产品确认前，本文件是决策输入，不是实现完成声明。

## 2026-10-23 本轮：人类明确授权后的本地实现

本轮在用户明确回复“实施”后，按以下边界落地 B3-09；这是人类授权的本地实现，
不是整体验收或发布声明：

- 风险与协作：managed 中风险；本轮只有一个代码 writer（当前主线程），主线程独立
  审查，不提交、不推送、不部署，并保留工作区全部既有 dirty 状态。
- 写入范围：`MultiTabKeepAlive.svelte`、新增
  `multitab-eviction.test.svelte.ts`、`packages/ui/src/index.ts` 的相邻类型导出，
  以及本决策记录；未新增包、抽象、关闭保护行为、键盘模型或样式。
- 未完成边界：真实产品路由、Provider/查询缓存协同、生产 storage 选型、跨浏览器
  标签页同步、读屏实机和 Chromium/WebKit/Firefox 全矩阵均未在本轮验收。

### 已实现的公开契约

- `maxTabs?: number` 为可选准入上限，不提供隐式默认值；显式提供时必须是正安全
  整数，否则 `openTab` 返回 `rejected + invalid-max-tabs` 且不修改 `tabs`。
- 额度只统计非固定标签；固定（`pinned`）标签永不自动淘汰，也不占可淘汰额度。
  当前活动标签、`dirty=true` 标签和 `closable=false` 标签不自动淘汰。
- 非固定候选按实际访问顺序 LRU 淘汰；tab 点击/键盘选择、刷新动作和外部
  `activeTabId` 变化都计入访问，首次并列回退到 `tabs` 数组稳定顺序。
- 新增类型化公开 `async openTab(tab): Promise<WorkspaceTabOpenResult>`，可通过
  `bind:this` 调用。结果区分 `opened`、`selected`、`rejected`，拒绝原因包括
  无效上限、同 id 不同 path、额度/守卫拒绝、并发占用、等待期间状态变化和卸载。
- 同 id 同 path 只激活既有标签，不重复插入；同 id 不同 path 直接拒绝，避免不同
  路由草稿串到同一标签快照。
- `maxTabs` 只作用于 `openTab` 这个原子打开入口。宿主直接赋 `tabs` 或下调
  `maxTabs` 不会触发任何偷偷删除；需要准入时应通过 `openTab`，由宿主决定拒绝
  提示或路由动作。

### 原子淘汰与宿主责任

- 超额时先计算所需淘汰数量并筛选可淘汰候选，再顺序调用既有 `onbeforeclose`
  异步守卫；守卫拒绝或抛错按保护处理，不删除任何标签。
- 等待守卫期间共享既有 `closeOperationInFlight` 锁，防止并发打开/关闭交叉淘汰；
  守卫结算后会再次校验原 `tabs` 数组对象、候选元素引用、`activeTabId`、`maxTabs`
  上限以及候选的 dirty/closable/pinned/path。卸载、目标替换或作用域变化均返回
  `stale-state`/`unmounted`，不会半删。
- 成功时以不可变方式生成新数组，不原地修改调用方（包括冻结数组）；先对每个被
  淘汰标签调用 `onclose` 供宿主清理快照，再设置新活动标签并调用 `onselect`。
- 无安全候选或守卫拒绝时 `tabs` 保持不变，并通过 `onTabLimitReached` 报告
  `no-safe-candidate` / `eviction-declined` 及额度信息。
- 路由跳转、查询取消、storage 写入和业务持久化仍由宿主负责；组件不伪造路由、
  查询或存储服务。

### 本轮本地验证与限制

- 新增 `multitab-eviction.test.svelte.ts`：**22/22** 通过，覆盖未设置上限、LRU
  访问/刷新/外部 active、非固定额度、固定标签、全保护拒绝、重复打开、无效上限、
  冻结输入、异步守卫拒绝/抛错、等待期 dirty/active/数组替换/卸载和并发锁。
- 既有 `multitab-close-protection.test.svelte.ts`：**29/29** 逐文件回归通过。
- 仅执行直接单文件 vitest、`git diff --check` 和定向 eslint；未运行全仓测试。
- 上述结果只证明本地组件契约和单测，不等于 B3-09 产品级完成、浏览器验收、真实
  路由/Provider/storage 验收或发布就绪。

## 2026-10-24 最终消费者验证

- 延续已授权的 B3-09 范围，pi 为代码 writer，主线程独立审查与验证；本次仅增加
  既有 fixture/spec 的消费者场景并恢复旧 close 测试的无关改动，没有追加生产功能。
- fixture 使用真实 `MultiTabKeepAlive`、`bind:this.openTab` 与现有状态 adapter。
  `maxTabs=3` 时按钮打开 Reports 仅淘汰 Mail，保留活动 Orders 与 dirty Invoice；
  `onclose` 清除 Mail 的持久化键，重新打开后 query/scroll 均为空。
- `maxTabs=2` 时需要淘汰两项但仅有一项安全候选，整次打开被拒绝，limit 回调一次；
  标签集合、活动项、query/scroll 与存储键保持不变。两个新增场景均无 pageerror。
- 主线程独立执行：淘汰单文件 **37/37，exit 0，7.00s**；关闭保护单文件
  **29/29，exit 0，11.17s**；原 `playwright.multitab-state.config.ts` 配置
  **24/24，exit 0，21.4s**。浏览器报告：
  `test-results/multitab-state-results.json`。
- 浏览器计数为 4 场景 × Chromium/WebKit/Firefox × desktop/narrow，其中旧
  2 场景共 12 项、新增 2 场景共 12 项。pi 的先行通过不与主线程重复累计。
- narrow 仅证明交互回归，不是移动视觉验收。真实产品路由、Provider/查询缓存、
  生产 storage、跨浏览器标签页同步、读屏实机和发布仍未验收。
- close 测试两处非空断言及 spec 的旧 scroller 未使用属于既有 lint 问题，
  不把这些文件宣称为全文件 lint 通过。未运行全仓测试，未提交、推送或部署。

## 2026-10-24 修复复审（B3-09，writer: pi）

本轮由 `pi` 作为唯一代码 writer，只修改本决策记录、`MultiTabKeepAlive.svelte`、
`multitab-eviction.test.svelte.ts` 和 `multitab-close-protection.test.svelte.ts`。
主线程不写入代码，只做 review 和独立验证；未提交、未推送、未部署，工作区既有
dirty 状态保持不变。

先前的 `multitab-eviction.test.svelte.ts` **22/22** 是初审阶段结果，不是最终结论。
主线程审查指出快照、LRU 身份、守卫语义和结果类型仍有缺口，因此本轮先补失败用例，
再修实现：

- 红灯：修复前新增用例使 `multitab-eviction.test.svelte.ts` 为 **12 failed / 25
  passed（共 37）**，失败集中在宿主不可变复制后的 LRU、显式固定标签超额、自动
  淘汰守卫 truthy 值、原地 push/reverse、非候选 pinned/dirty 变化、活动标签切到
  非候选、incoming id 变化和 guard 替换。
- 绿灯：修复后同一单文件 **37/37**；既有
  `multitab-close-protection.test.svelte.ts` **29/29**；定向 eslint 三个文件无错误；
  `git diff --check` 无输出。

### 本轮修复点

1. `openTab` 在第一个 await 前捕获完整状态快照：数组引用、长度/顺序、每个元素的
   对象引用及 `id/path/pinned/dirty/closable`，以及 `activeTabId`、`maxTabs`、
   `onbeforeclose` 身份和 incoming tab 的身份字段。任一变化（含原地 push/splice/
   reverse、非候选 unpin、incoming id 改为已有 id、活动切到非候选、guard 替换）都在
   await 后返回 `stale-state`，不提交、不调用 `onclose/onselect`，也不发 limit 回调。
   快照只保留需要的标量，不使用整对象 `JSON.stringify`。
2. LRU 从对象身份 `WeakMap` 改为逻辑 `id + path` 的访问顺序 `Map`；宿主
   `tabs.map({ ...tab })` 后仍保留最近访问顺序。宿主移除标签时清理消失键，避免
   Map 无限增长；不同 path 不继承同一 id 的旧访问顺序。
3. `maxTabs` 校验改为实际 `boolean` 判断，不再用“允许 undefined 却声明为
   `value is number`”的不真实类型守卫；无效值继续返回 `invalid-max-tabs`。
4. 显式 `pinned` 的新标签直接准入，不占非固定额度；即使宿主已把上限下调到低于
   当前非固定标签数，也不会因打开固定标签而额外清理普通标签。
5. 自动淘汰使用独立的严格守卫：没有 `onbeforeclose` 时可通过；只有 await 结果
   `=== true` 才准许；`undefined`、其他 truthy 非 boolean 或抛错均 fail-closed 为
   `eviction-declined`。旧的手动关闭守卫契约保持不变。
6. `WorkspaceTabOpenResult` 改为可判别 union：`opened/selected` 必带 `tab` 和
   `evictedTabIds`，`rejected` 必带 `reason` 和 `tab`，不再堆叠 optional 字段。
7. 新增“需要淘汰 2 项，首项确认、次项拒绝”的原子性用例，断言 0 移除、0
   `onclose`、0 `onselect`，避免只证明第一候选拒绝。
8. 新增淘汰测试移除固定 20ms sleep，改用 `tick`/`await`/`waitFor`；无效上限新增
   `Number.MAX_SAFE_INTEGER + 1`。既有 close 单文件的 `flushPending` 和两处非空
   断言最终恢复原样，仅保留此前键盘及 aria 测试，避免扩大无关改动。

### 仍未覆盖的边界

修复复审时上述结果只证明本地组件契约和单文件回归。后续受控消费者浏览器矩阵
已通过，见“最终消费者验证”节；真实产品路由、Provider/查询缓存协同、生产 storage
选型、跨浏览器标签页同步、读屏实机和发布验收仍未完成。本记录不是 B3-09 产品级
完成声明，也不把初审 22/22 当作最终结果。

## 2026-10-24 测试质量复核

本节只补充当前测试质量事实，不回写或替代上方历史段落。上文出现的 11/11、
13/13、20/20、22/22、24/24 等计数均为各阶段历史结果，不代表当前最终状态；历史
证据和当时结论保持原样。

- `packages/ui/src/components/workspace-tab-state.test.svelte.ts` 中此前三处
  `no-non-null-assertion` 已由显式 guard 修复：测试先从 storage 取 key，并在
  `key === undefined` 时主动抛错，后续不再使用 `key!`。三处断言分布在两个用例，
  当前文件不再依赖非空断言访问该 key。
- 当前该测试文件的定向 ESLint 为 **0 问题**（`bunx eslint
  packages/ui/src/components/workspace-tab-state.test.svelte.ts --max-warnings 0`，
  exit `0`）。这只证明该单文件通过定向 lint，不是全仓或全量 ESLint 结论。
- 当前 `workspace-tab-state` 单文件测试为 **21/21 passed**，exit `0`，6.13s
  （`bunx vitest run src/components/workspace-tab-state.test.svelte.ts`）。本轮
  未运行全量测试，未修改源码或测试，未提交、推送或部署。
