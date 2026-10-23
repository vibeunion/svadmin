# ComboboxField 多选已确认值失败保持

## 续接约定

- parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B2-05；
  source：矩阵下一动作要求只读确认多选已确认值在取消搜索、分页失败/重试后的保持；
  reason：既有用例已覆盖搜索取消防抖、重开首屏、旧响应隔离和普通分页失败，
  但分页失败用例没有已确认多选值，未断言失败期间的选中回显。
- scope：只处理 `ComboboxField` 已确认多选值的摘要回显，以及直接单测和本证据；
  不改搜索取消协议、Provider/RBAC、网络层、AutoComplete 公开 API 或虚拟化。
- 非目标：不新增重复的搜索 debounce、旧响应隔离、分页、关闭回焦或跨浏览器场景；
  不证明真实 Provider、请求取消/超时、读屏或发布。
- Delegation Decision：low / native；单一 writer，增量单文件 Vitest 和
  `git diff --check` 作为确定性验证，未提交、推送、发布或部署。

## 缺口与契约

只读基线：`combobox-field.test.svelte.ts` **42/42 passed**。既有
`retries a failed next page without skipping it` 只覆盖无已确认值的单选分页重试；
`loads selected records separately...` 只覆盖已有选中值的首屏回显。两者都未覆盖
“已确认多选值 + 后续分页失败”的组合。

```gherkin
Given 多选字段已经确认了至少一个值
When 加载后续页失败并显示重试入口
Then 宿主 value、清空入口和已确认值的摘要回显保持不变
And 不调用 onchange，候选列表按现有语义隐藏

When 点击重试并成功加载后续页
Then 既有已确认值仍保留
And 继续选择新选项时回调包含旧值和新值
```

未确认的搜索草稿继续遵循既有公开语义：失败/关闭后不新增草稿保留承诺，
重开仍回到空搜索第一页；本轮没有改变这部分行为。

## 红绿结果

- 首轮新增测试为红：`combobox-field.test.svelte.ts` **2 failed / 41 passed**。
  其中 1 项是测试辅助 `getMany` 的 mock 泛型触发既有严格 TypeScript 编译用例，
  产品侧缺口只有 1 项：分页失败后触发器摘要从 `First` 变成占位文本。
- 修正测试辅助类型后仍红：**1 failed / 42 passed**，失败断言为
  `expected 'Select... ' to contain 'First'`，确认是组件回显缺口而非测试错误。
- 修复方式：新增仅用于摘要的 `selectionOptions`，合并当前 `select.options`
  与同作用域已加载选项，不受候选列表 `isError`/搜索过滤影响；
  `availableOptions` 的错误隐藏、可选性和分页语义保持不变。
- 修复后同一单文件 **43/43 passed**，退出码 0，duration 14.04s；包含既有严格
  类型用例、搜索取消、旧响应隔离、分页重试和新增失败保持用例。

## 20261023 修正：权威标签与失败边界

- 修正前基线：主线程首版单文件 **43/43 passed、exit 0、duration 13.70s**，
  保留为修正前基线；pi 首版同文件为 43/43、exit 0、14.04s。该版本只证明了
  “后续分页失败时摘要仍显示”，没有区分旧页缓存与已选记录查询的权威标签。
- 缺口：`selectionOptions` 先写入 `select.options` 再覆盖同作用域 `loaded`，
  导致旧页缓存可以覆盖已选记录查询最新成功返回的标签；同时
  `defaultValueQuery` 失败时仍回退到 `loaded`，把旧标签暴露在既有失败隐藏
  边界之外。修正只涉及 `ComboboxField` 摘要合并顺序和失败边界，未改
  `packages/core`、Provider/RBAC、错误码解析或公开查询协议。
- 最小红测：在既有分页失败/重试用例上保留普通分页失败值不丢失和重试后
  `[1, 2]` 载荷断言，但把成功独立查询后的标签期望改为 `Selected 1`；另新增
  “第 1 页旧缓存 `First` 不得覆盖最新成功 `Selected 1`”和“已选记录查询失败时
  旧缓存不得回显”两项。修正前运行：**45 项中 3 failed、42 passed、exit 1**，
  该次运行包含测试准备问题：新分页用例的 total 为 2、小于 fetchSize 10，
  未出现 Load more；另一用例在首屏列表仍含记录时错误期待独立查询标签，
  与 Core 既有列表优先语义不符。因此三项失败不能全部计为产品缺陷红测。
  最终测试修正 total 并在离开旧页后断言独立查询标签，保留 Core 合并语义。
- 最小修复：`selectionOptions` 从空表开始；`defaultValueQuery.isError` 时
  直接返回空表，保持旧实现的失败隐藏标签边界；否则先放同作用域旧页缓存，
  再用 `select.options` 覆盖，使成功查询的新标签优先于旧页缓存。
  `availableOptions`、候选列表错误隐藏、可选性和分页协议未改。
- 修正后同一单文件：**45/45 passed、exit 0、duration 13.67s**。普通候选分页
  失败仍保留已确认值和清空入口，重试后继续选择仍回调 `[1, 2]`；标签若被成功
  独立查询刷新则跟随权威新值，不再固定旧 `First`。
- 本轮没有新增浏览器或其他测试；主线程对修正后版本独立复核
  **45/45 passed、exit 0、duration 13.62s**，`git diff --check` exit 0。

```sh
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/combobox-field.test.svelte.ts
```

## 浏览器与复核

- 本轮没有新增真实浏览器场景，因此未重跑
  `scripts/fixtures/enterprise-ui/playwright.combobox.config.ts`，也不重复既有
  跨浏览器 24/24 证据。既有 fixture/spec 未修改。
- pi 结果：首版增量单文件 **43/43 passed**、exit 0、14.04s；当前修正版
  **45/45 passed**、exit 0、13.67s；`git diff --check` 通过。
- 主线程结果：首版 **43/43 passed、exit 0、duration 13.70s** 作为修正前基线
  保留；当前修正版 **45/45 passed、exit 0、duration 13.62s**，
  `git diff --check` exit 0，已独立复核。运行仍有既有 svelte2tsx source map
  缺失警告，不影响本次测试退出码；未扩展修复依赖包。

## 边界

本地 DataProvider stub 只证明组件契约。普通候选分页失败期间保留的是已确认值
及其权威摘要；已选记录查询失败时继续隐藏标签，不把旧页缓存当作权威回显。
不承诺真实网络取消、服务端分页一致性、真实 Provider 权限、读屏认证、
发布包消费或部署。
