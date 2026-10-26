# B3-01 真实源码消费者浏览器验收

日期：2026-10-22。parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B3-01。
本轮唯一 writer 为 pi；主线程独立验证。managed 中风险测试夹具，一个 writer、一个 verifier。
pi 自测与主线程独立复核为两次独立运行，分开记录，不合并；未提交、推送、部署或发布。

## 1. Contract 与 Gherkin

范围只新增真实源码消费者浏览器夹具与专属 Playwright 配置，复用
`ResourceOperationsPage → AutoTable → QuickEditDrawer`，不新建业务 UI，不修改生产组件。

```gherkin
Scenario: 首次查询失败后键盘重试并保留查询、分页、选择与详情回读
  Given 资源工作台首次列表查询失败
  When 用户使用键盘激活 Retry
  Then 列表恢复并显示真实 Provider 分页记录
  And 搜索 needle 后 Provider 收到精确搜索过滤与分页
  And 进入第 2 页并选择记录 11
  And 打开真实详情抽屉后关闭
  Then 搜索、分页和选择均保留
  And 没有敏感诊断文本泄漏

Scenario: 快速编辑首次失败保留草稿，显式重试后刷新规范化服务端值
  Given 搜索 needle、位于第 2 页并选择记录 11
  When 通过 More actions 打开 Quick edit
  And 将 Title 改为 needle draft title
  And 首次 Save 失败
  Then 抽屉保持打开且草稿不丢失
  And update 只调用 1 次，资源/ID/variables/tenant 精确匹配
  And 失败时无敏感诊断泄漏
  When 用户显式再次 Save
  Then update 恰好调用 2 次
  And 抽屉关闭并刷新为服务端规范化值
  And 搜索、第 2 页分页和选择均保留
  And 保存失败抽屉打开时 narrow 控件在视口内且页面无横向溢出

Scenario: 列表可读但详情和编辑被拒绝
  Given 列表读取允许
  And show/edit 权限均被拒绝
  When 用户加载列表并打开 More actions
  Then 不出现 Detail/Edit 入口
  And More actions 中不出现 Edit/Quick edit
  And 不读取详情、不写入
```

## 2. 夹具与证据边界

- `ResourceWorkspaceFixture.svelte` 直接挂载真实 `ResourceOperationsPage`，由后者组合真实
  `AutoTable` 与 `QuickEditDrawer`，使用真实 `provideAdminContext`、`QueryClient` 和本地内存
  `RouterProvider`。
- 受控本地 `DataProvider` 按 `filters` / `sorters` / `pagination` 真实筛选、排序和分页；
  36 条记录中 `needle` 命中 12 条，满足两页。搜索跨 `title`/`team` 生成 OR contains 过滤。
- 本地 router 保存并回读 query 参数；详情打开写入 `detail`，关闭时通过历史回退恢复原查询。
- hidden `output` 只用于观测 `getList`、`getOne`、`update`、写入和权限检查调用，不伪造主组件 UI。
- 失败与拒绝由 URL 参数控制：`fail=list-once`、`fail=update-once`、`deny=show-edit`。
- 生产组件未修改；未新增完整编辑路由页面，本轮只把既有三条流程浏览器化。

## 3. 浏览器断言

- 三引擎 Chromium/WebKit/Firefox × desktop/narrow，共 18 个用例，`workers: 1` 顺序运行。
- 专属配置使用 4191 端口，不占用现有 4189；此前调试确认本机 WebKit 对 4190 端口无法完成
  `page.goto`，改到 4191 后三引擎均可运行，这不是生产缺陷。
- 所有用例注册 `pageerror` 并断言为空；动画不取消，通过 `getAnimations()` 等待完成。
- 快速编辑失败时断言抽屉仍打开、草稿仍在、`update` 为 1 次且无敏感诊断文本；重试成功后
  `update` 恰好 2 次，逐次 `toEqual` 精确断言
  `{ resource: 'browser-records', id: 11, variables: { title: 'needle draft title' }, meta: { tenantId: 'tenant-a' } }`。
- narrow 在保存失败抽屉打开时检查抽屉、Title、Save 的边界均在视口内，并断言页面无横向溢出。
- 截图输出到忽略目录 `output/playwright/resource-workspace-browser-20261022/`，三引擎各 5 张。

## 4. 运行结果

仅执行新专属 Playwright，不运行全量 test/build/typecheck：

```sh
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.resource-workspace.config.ts
```

pi 自测原始结果：**18/18 passed，原始 exit code 0，duration 29.9s**。随后执行
`git diff --check`，原始 **exit code 0**。本轮未使用 `tail` 截断退出码。

主线程随后独立复核同一专属 Playwright 配置（未修改用例或配置），原始结果：
**18/18 passed，原始 exit code 0，duration 31.7s**；并独立执行 `git diff --check`，
原始 **exit code 0**。该次为与 pi 自测分开的独立运行，不合并次数或时长。

调试中曾修正用例自身的标题子串匹配、mobile card 定位和 `getByLabel` 选择器，并因 WebKit
端口限制从 4190 改到 4191；未据此认定生产缺陷，也未扩大生产代码范围。

## 5. 未验收边界与状态

本证据只覆盖受控本地 Provider、受控 AccessControl stub 与本地浏览器，不证明真实服务端
RBAC/租户、持久化、网络错误分类、幂等、读屏设备、发布包或部署。原始主流程段落不覆盖独立“编辑完整路由页面”，该范围已在第 6 节及其主线程补记中单独闭环。

当前状态：**本地浏览器证据已复核。** pi 自测 18/18 passed、原始 exit code 0、
duration 29.9s；主线程独立复核同一专属配置 18/18 passed、原始 exit code 0、
duration 31.7s；两次独立运行分开记录，`git diff --check` 均为原始 exit code 0。
真实 Provider/RBAC、服务端持久化、读屏与发布仍未验收；独立“编辑完整路由页面”已在第 6 节 follow-up 补充单文件 Chromium desktop 闭环，并已在第 6 节末由主线程独立复核。
## 主线程独立复核

- 独立执行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.resource-workspace.config.ts`：18/18 passed、exit 0、31.7s，覆盖 Chromium/WebKit/Firefox × desktop/narrow。
- `git diff --check` exit 0；本轮未修改生产组件、fixture 或测试断言。结果与 pi 自测分开记录，不合并计数；仅证明受控 Provider 下的浏览器行为，不证明真实服务、RBAC、读屏、完整编辑路由或发布。

## 6. Follow-up：完整编辑路由浏览器闭环

日期：2026-10-22。parent 为同一 B3-01 的“资源工作台原始查询/详情/编辑/恢复范围”，
reason 为上一轮只覆盖 `QuickEditDrawer` 与路由导航日志，未验收真实完整编辑页。
本轮仍由 pi 作为唯一 writer；当时主线程结果待独立复核，后续复核结果见本节末。未提交、推送、部署或发布。

先核对现有契约：`useNavigation.edit` 通过 `sanitizeListQueryParams` 保留
`page/pageSize/sort/order/q/filters`，`useContractForm` 保存后通过
`appendListQueryFromPath` 把当前编辑页查询带回列表。本轮只按该实际契约断言，未新增语义。

新增 `ResourceWorkspaceEditRouteFixture.svelte`，直接挂载真实 `AdminApp`，由真实
`AutoTable` 的完整 `Edit` 按钮进入 `/:resource/edit/:id`，再由真实 `AutoForm` 加载和提交；
没有手写假编辑页，没有用 `QuickEditDrawer` 代替完整编辑页。数据仍由受控本地
`DataProvider` 提供，router 只解析/回读 pathname 与 query，不冒充后端。

```gherkin
Scenario: 列表查询和分页进入真实完整编辑页，失败保留草稿，重试后按现有路由契约返回列表
  Given 资源列表可读且编辑权限允许
  When 用户搜索 needle 并进入第 2 页
  And 点击记录 11 的完整 Edit 按钮
  Then 真实编辑页出现且 getOne 精确读取 browser-records/11
  And 编辑路由保留 q=needle 与 page=2
  When 修改 Title 后首次 Save 失败
  Then 编辑页保持、草稿不丢失且 update 恰好调用 1 次
  When 用户显式再次 Save
  Then update 恰好调用 2 次且返回服务端规范化值
  And 返回列表后显示 needle normalized title
  And 列表路由恢复 q=needle 与 page=2，列表重新查询仍使用该搜索和第 2 页
```

专属配置只运行 Chromium desktop 单文件用例，端口 4192，不占用既有 4191。

```sh
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.resource-workspace-edit-route.config.ts
```

pi 自测原始结果：**1/1 passed，原始 exit code 0，total duration 4.1s**（test duration 3.4s）；
随后执行 `git diff --check`，原始 **exit code 0**。截图位于忽略目录
`output/playwright/resource-workspace-edit-route-20261022/`，共 3 张。

本轮未发现需要修复的生产缺陷；调试中只修正 fixture 的 AdminApp prop 名称、侧栏权限
日志造成的 Svelte effect 循环、完整 Edit 入口定位和 tenant meta 传参，均属夹具与用例自身。

未验收边界：仍不证明真实 Provider/RBAC、服务端持久化、跨引擎、narrow、读屏或发布；
“主线程独立复核尚未执行”是本节历史记录，已由下方 2026-10-23 的主线程复核结果取代。

## 完整编辑页主线程独立复核（2026-10-23）

- 命令：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.resource-workspace-edit-route.config.ts`；Chromium desktop 1/1 passed、exit 0、4.2s，与 pi 1/1、4.1s 独立记录。
- 审查确认真实 AdminApp 渲染列表及完整 AutoForm 编辑页，非抽屉替代；用例实际点击 Edit、Save、再次 Save，断言失败草稿保留、两次 update 的完整载荷、返回后规范化值及 q/page 恢复。
- RouterProvider 的路径/参数存在 fixture 内存，隐藏输出只观察该状态；未使用真实地址栏导航或 reload 验证。因此证明的是本地真实组件与受控路由组合，不是浏览器历史恢复、真实后端持久化或 RBAC。
