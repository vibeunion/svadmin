# MultiTabKeepAlive 关闭保护与移除清理

## 续接约定

- parent: `enterprise-ui-acceptance-matrix-20261022.md` B3-09；source: 用户继续完善企业级规范。
- reason: 已有 `multitab-gantt.test.svelte.ts` 只断言渲染、Space 激活和刷新；关闭保护、
  全关后的激活标签清理以及逐标签清理回调均无契约。
- goal: 为多标签工作区提供最小、可验证的关闭保护，并修正全关/关闭其他的移除语义。
- scope: `packages/ui/src/components/MultiTabKeepAlive.svelte`、
  `multitab-close-protection.test.svelte.ts`、`multitab-close-protection.test-host.svelte`
  和本文。
- non-goals: 不实现路由/查询/草稿/滚动持久化，不新增 LRU 淘汰策略，不改 Lite 组件、
  真实路由或 Provider 协议。
- risk/orchestration: **medium / managed**；pi 为唯一 writer，主线程作为独立 verifier；
  未提交、未推送。

## 产品决策

- “关闭有草稿标签的确认”由消费方通过可选 `onbeforeclose(tab)` 提供；组件只负责在移除前
  调用并遵守 `false`/抛错结果，不内置确认弹窗或草稿存储。
- `dirty` 仅作为消费方在标签上的声明字段，组件不据此自行拦截；是否保护由
  `onbeforeclose` 决定，避免组件猜测业务草稿状态。
- 守卫拒绝后释放该实例的待确认状态，下一次明确点击会重新询问；确认在途时重复点击或
  批量交叉复用同一个 Promise。
- 路由、查询、草稿和滚动的恢复属于真实工作区容器职责，本轮不扩展为组件全功能。
- 淘汰（`maxTabs`/LRU）缺少产品上限和固定标签优先级规则，本轮不实现，保留为未验收。

## 第一轮红测与修复

新增 `multitab-close-protection.test.svelte.ts`，直接渲染真实 `MultiTabKeepAlive`，未 mock
组件。首轮红测 **7 failed / 7**：全关按钮无可访问名称、全关后 `activeTabId` 残留、关闭
守卫从未调用、守卫拒绝后仍移除、全关/关闭其他忽略守卫、异步守卫抛错无保护。最小修复后
新增 7 条与既有 3 条同命令 **10/10 passed**。

## 第二轮：主线程复核后的并发反例

主线程初版独立复核 10/10、5.59s，但审查指出：`await onbeforeclose` 后仅按 id 删除，
确认期间同 id 标签被替换/固定/`closable: false`/组件卸载仍可能误删；重复点击与全关交叉
会重复确认或重复回调。补充 8 条 deferred 反例（重复点击、单关与全关交叉、同 id 替换、
固定、不可关闭、卸载、旧批次重开同 id、关闭其他目标消失），红测
**8 failed / 7 passed（15）**，修复后 **15/15 passed**。

## 第三轮：确定性缺陷与最终修复

主线程再次审查指出 15/15 仍是中间态，存在三个确定性缺陷：

1. 守卫拒绝后 `pendingCloses` 永不删除，同一标签第二次明确点击复用 `false`，无法再确认。
2. `Object.defineProperty` 修改调用方标签对象；冻结对象的指纹无法区分“相同内容重开实例”，
   仍可能误删新实例。
3. 批量一次性创建所有意图，会同时打开多个确认对话框；重复批量请求也未阻止。

### 新增反例（针对缺陷语义）

1. 第一次守卫拒绝后再次点击，第二次确认通过并关闭，`onclose` 只回调一次。
2. 冻结标签确认期间用**相同内容的新实例**替换，旧确认不得删除新实例。
3. 批量确认同时至多一个守卫在途；重复点击“关闭全部”不增加确认调用；拒绝的标签不被
   批量通知绕过。

为确认反例有效，临时恢复缺陷行为（拒绝不释放、按 id 删除、批量并行）后执行同文件过滤
用例：**3 failed / 15 skipped**；恢复修复版后全部通过。

### 第三轮实现（已被第四轮取代）

使用 WeakMap 待确认状态、`splice` 原位删除和 `revision`/`visibleTabs` 驱动更新，
单文件达到 **18/18**。主线程再次审查指出这仍是中间态：

1. `splice` 修改调用方数组，冻结数组会抛错；`visibleTabs` 只覆盖列表渲染，非代理
   数组下 Close all/Refresh 的显示可能不更新。
2. 已允许但未删除的 intent（固定/替换/关闭其他目标消失）留在 WeakMap，后续操作可能
   复用旧授权。
3. 卸载后批量循环仍会调用后续 guard。

## 第四轮：关闭操作锁与 immutable 赋值（最终）

### 新增反例

1. 冻结数组上的单关与全关，且调用方数组长度/内容不变。
2. 非代理 plain 数组最后关闭后 Close all 按钮消失。
3. 关闭其他因目标消失取消后，再次关闭同一标签必须重新调用 guard。
4. 批量确认期间卸载组件，不再调用后续 guard，也不交付回调。

用上一版 18/18 实现执行同文件过滤用例：**4 failed / 18 skipped**；修复后全部通过。

### 最终实现

1. **统一关闭操作锁** `closeOperationInFlight`：单关、全关、关闭其他同一时刻只允许一个
   关闭意图；批量内部顺序逐个确认。退出 `finally` 释放锁，不再依赖 WeakMap 缓存授权。
2. **不改写调用方对象**：不使用 `splice`、不写入 Symbol/指纹；每次操作只在最后做一次
   immutable `filter` 赋值。批量先收集允许的当前对象引用，结束前统一校验并按引用过滤；
   单关同样一次赋值。
3. 捕获标签**对象引用**，删除前按 id 找到当前标签并要求 `current === tab`，再复检
   `pinned`/`closable`；同 id 重开或冻结同内容新实例均不会误删。
4. 守卫拒绝或抛错后操作结束即释放锁；下一次明确点击重新调用 guard，不复用旧结果。
5. `onDestroy` 置 `disposed`；批量每个 await 后与下一次 guard 前检查，卸载后立即停止
   后续确认和交付。
6. “关闭其他”在每次 guard 前及删除前复验目标原实例仍在；目标消失或被替换则中止整批，
   不删除其余标签。
7. 全关按钮与刷新可用性直接读取响应式 `tabs`，immutable 赋值同时驱动列表、按钮和
   绑定宿主更新，无需额外 revision。

## 修复后验收

执行（严格单文件）：`bunx vitest run src/components/multitab-close-protection.test.svelte.ts`
→ **22/22 passed**（首轮 7 + 第二轮 8 + 第三轮 3 + 第四轮 4）。`git diff --check` 通过。
主线程独立复核：`bunx vitest run src/components/multitab-close-protection.test.svelte.ts`
→ **22/22 passed**，duration `6.71s`；`git diff --check` 退出码 `0`。该结果与 pi
结果分开记录，不合并执行次数。

## 未验收边界

- 真实路由/查询/草稿/滚动恢复未验证；组件只提供关闭保护钩子，不提供状态持久化。
- 淘汰策略（数量上限、LRU、固定标签优先）未实现，需产品给出上限与淘汰规则。
- 未覆盖真实工作区容器、跨浏览器、读屏、内存/性能与发布构建。
- Lite 组件的 1:1 对齐声明本轮未复核，也未同步关闭保护能力。
