# 共享视图（B3-02）真实源码消费者浏览器验证

- 日期：2026-10-22
- 范围：真实 `AutoTable.svelte` 消费者、真实 Core/QueryClient、受控本地 `SavedListViewProvider`
- 模块：`packages/ui` saved-list-views / AutoTable
- 执行者：pi（唯一 writer）
- 环境：本地仓库 `/Users/zhd/workspace/svadmin`；不涉及远程环境

## Gherkin contract

```gherkin
Feature: Saved list views through the real AutoTable consumer
  Scenario: Personal view persists and restores the exact provider query
    Given the real AutoTable is mounted with the real Core context and QueryClient
    When the user searches for a record and saves a personal view through the Views popover
    And the user changes the search
    And the user applies the saved personal view through the original view selector
    Then the provider receives the saved search query again
    And reloading the page restores the same persisted personal view and query

  Scenario: Team view keeps its draft after a failed remote save
    Given the remote provider rejects the first team save with a private diagnostic
    When the user saves a team view through the Views popover
    Then the draft name remains and only a generic failure is shown
    And no personal view is persisted locally
    When the user explicitly saves again
    Then the provider receives exactly the team source, expected version, and current query
    And no duplicate remote request or false local-only success is reported

  Scenario: Explicit retry recovers remote views without writing read-only views
    Given the remote provider fails the first view read
    When the user retries through the original failure UI
    Then the existing team and system views are available
    And applying a read-only view performs no remote write
```

## 状态口径

- 本节同时记录 pi writer 自测与主线程独立复核，两者分开列示，不合并为同一次运行。
- 本验证只证明真实组件源码、本地受控 Provider、浏览器交互与查询载荷；不证明真实服务端授权、持久化、读屏或发布。

## 实现边界

- 消费者：`scripts/fixtures/enterprise-ui/SavedListViewsFixture.svelte` 直接 import `packages/ui/src/components/AutoTable.svelte`，没有复制或模拟视图控件。
- 运行环境：真实 `provideAdminContext`、真实 `QueryClient`/`QueryClientProvider`、真实 `AutoTable`，配本地可控 `DataProvider` 与 `SavedListViewProvider`。
- 交互路径：搜索、打开视图面板、命名、保存、切换视图归属、应用视图、失败提示、显式 Retry 均由实际 UI 点击/键盘完成；未调用模型内部方法，也未用 fixture 按钮代替组件保存、应用或重试。
- 失败配置：通过 URL 参数 `fail=save-once`、`fail=list-once`、`seed=remote` 控制本地 Provider；通过只读 `data-testid` 日志观察 list/save/write/query 调用，测试断言不依赖硬编码通过按钮。
- 截图目录：`output/playwright/saved-list-views-browser-20261022/`（`output/` 已被忽略）。

## 本轮断言修正（fixture/spec 层，非实现缺陷）

- 首轮 fixture 断言误把搜索词折进保存态的 `state.filters`。按真实契约核对 `list-state.svelte.ts` 与 `SvarResourceTableView.svelte` 后确认：搜索是独立的 `state.search`，保存态 `state.filters` 只包含用户显式过滤条件，本场景应为空数组；Provider 侧才把搜索编译为 `email`/`team` 两个 `searchable` 字段的 `or` 条件。该修正只改测试预期，不伪称生产实现存在缺陷。
- `waitForQuery` 不再使用 `JSON.stringify(...).toContain(value)`，而是对完整 Provider 查询做 `toEqual`：`filters` 为 `[{ operator: 'or', value: [{ field: 'email', operator: 'contains', value }, { field: 'team', operator: 'contains', value }] }]`，`sorters` 为 `[]`，`pagination` 为 `{ current: 1, pageSize: 10 }`。保存态另以独立构造的完整对象断言 `search`、空 `filters`、`sorters`、`pagination`、`columnVisibility`、`columnOrder`。
- 个人视图在保存后读取本地持久化 state 与独立预期比较；应用视图前后及刷新后均重新检查完整 Provider 查询，避免用保存时的日志自证恢复结果。
- 团队视图对每次 `save` 的 scope 断言 `resourceName: 'saved-view-records'`、`providerName: 'default'` 且无 `tenantIdentity`；对第一次失败与第二次成功比较名称、`source: 'team'`、`expectedVersion: null`、完整 `state.filters/sorters/pagination/search` 等业务内容，不要求两次 `id` 相同，也不宣称服务端幂等。
- 失败弹层展开时新增截图与 narrow 视口边界检查：表单、名称输入、保存、刷新/重试按钮的 bounding box 必须落在视口内；检查在打开弹层并等待动画结束后执行，避免把仍未完成定位的弹层误判为布局缺陷。三个场景原有的 Escape 后截图与页面横向溢出检查保留。
- 标签页/输入框偶发空值时，测试先等待弹层可见、加载状态结束与进入动画完成，再执行填写；这是测试同步修正，未通过 fixture 样式或跳过用例掩盖组件问题。本轮未发现需通过改 fixture 样式规避的真实布局/焦点缺陷。

## 执行命令

```bash
cd /Users/zhd/workspace/svadmin
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.saved-list-views.config.ts --reporter=line
```

## 执行结果（pi 自测，本轮最终）

- Playwright：Chromium / WebKit / Firefox，各 desktop `1440×1000` 与 narrow `390×844`，共 18 个用例。
- 结果：`18 passed (50.8s)`，原始 exit code `0`；`git diff --check` 原始 exit code `0`。
- 未运行全仓测试、全仓 build 或 typecheck；未修改生产实现或依赖。

## 用例覆盖

1. 个人视图：搜索 `alpha` 保存个人视图，本地持久化 state 与独立预期完整相等；改为 `beta` 后通过原视图选择器应用保存视图，完整 Provider 查询恢复为 `alpha` 的 OR filters/sorters/pagination；刷新页面后再次按同一完整预期恢复。
2. 团队视图：首次团队保存被 Provider 拒绝，只显示通用失败，失败弹层展开时截图并检查 narrow 控件边界，草稿 `Team triage` 保留，私有诊断未出现在页面；再次显式保存成功，两次保存 scope 与业务 state 精确断言，`id` 不要求相同；保存请求总数精确为 2，Provider list 未重复，本地存储不包含该团队视图名称。
3. 远端读取失败：首次 list 失败后出现通用错误与 `Retry`，失败弹层展开时截图并检查 narrow Retry 边界；显式 Retry 后恢复已有 team/system 视图；team 视图应用后完整查询为 `team-seed`，system 只读视图应用后完整查询为 `system-seed`；只读视图删除与默认设置入口均禁用，所有远端写调用计数为 0。

所有用例同时断言 `pageerror` 为空；narrow 视口断言 `documentElement.scrollWidth <= innerWidth` 无页面横向溢出，并在弹层展开时检查表单/名称/保存/刷新或重试控件不越出视口。截图覆盖三个场景 × 三引擎 × 两视口，且新增 `personal-saved-open`、`team-save-failed`、`remote-list-failed` 展开态截图。

## pi 自测与主线程复核

- **pi 自测**：上述专属 Playwright 命令 18/18 通过、原始 exit code `0`；`git diff --check` 原始 exit code `0`。pi 已核对首轮测试错误修正后的 `state.search` / 空 `state.filters` 断言、团队 save scope 与 mutation state、只读视图零写调用。
- **主线程独立复核**：主线程已独立复跑同一专属 Playwright 命令，Chromium / WebKit / Firefox × desktop / narrow 共 18/18 passed，原始 exit code `0`；另行独立执行 `git diff --check`，原始 exit code `0`。主线程另抽查 `webkit-narrow` 失败弹层截图，确认表单、名称输入、保存与刷新/重试控件均在视口内，且页面无横向溢出。主线程复核与 pi 自测为两次独立运行，结论分开记录。

## 仍未证明

- 真实共享视图服务、服务端团队/系统写授权、跨用户并发与默认视图冲突（主线程浏览器复核仍为本地受控 Provider，不改变该边界）。
- 真实服务端持久化、数据库事务、跨设备恢复和后端审计。
- 屏幕阅读器认证、发布包、部署与生产环境。
- 失效字段在真实服务端元数据下的提示策略；本 fixture 只使用当前资源字段。
