# 任务列表与通知设置跨引擎矩阵

- 日期：2026-10-24
- 范围：仅扩展既有 enterprise-ui 任务列表与通知设置浏览器场景的
  Chromium / Firefox / WebKit × desktop / narrow 矩阵。
- 命令执行目录：`scripts/fixtures/enterprise-ui`
- 端口：`4189`，任务矩阵与通知矩阵顺序执行，未同时占用。
- 修改文件：
  - `scripts/fixtures/enterprise-ui/playwright.task-list.cross-browser.config.ts`（新增）
  - `scripts/fixtures/enterprise-ui/playwright.notifications.config.ts`
  - `scripts/fixtures/enterprise-ui/browser.spec.ts`（仅两个键盘可达性场景与
    有界 Tab helper）
- 恢复文件：`scripts/fixtures/enterprise-ui/playwright.task-list.config.ts` 的
  `projects` 已恢复为原有 `desktop` / `narrow`，与其他复用该基础配置的配置
  保持兼容。
- 未修改产品源码、AutoForm / FieldRenderer / FileUpload、锁文件、发布或部署
  状态；未提交、未推送。

## 配置

- `playwright.task-list.config.ts`：保持原有 `desktop` 1440x1000 与
  `narrow` 390x844 两个项目，不直接扩大被十几个配置继承的基础配置范围。
- `playwright.task-list.cross-browser.config.ts`：继承原任务列表配置并定义 6 个项目：
  - `chromium-desktop` 1440x1000
  - `chromium-narrow` 390x844
  - `firefox-desktop` 1440x1000
  - `firefox-narrow` 390x844
  - `webkit-desktop` 1440x1000
  - `webkit-narrow` 390x844
- `playwright.notifications.config.ts`：保留显式的 6 个同名项目，不依赖基础
  配置的项目数。

测试中的 `testInfo.project.name.endsWith('narrow')` 分支和旧截图路径仍按项目名工作。

## 键盘可达性调查与修复

初次跨引擎执行保留了两个真实红灯：

- `task details are keyboard reachable and row actions do not select the row`
  在 `firefox-narrow`、`webkit-desktop`、`webkit-narrow` 失败；
- `task title remains keyboard reachable with the actions column hidden`
  在同样三个项目失败。

定位结果：

- 焦点起点 `task-focus-start` 后只按一次 `Tab` 的固定顺序假设不成立。
- Firefox narrow：可滚动表格容器 `div[data-slot="table-container"]` 成为额外的
  真实 Tab stop，之后才是 Cancel / Details。
- WebKit desktop/narrow：宿主未开启全键盘访问时，普通 `Tab` 只遍历表单控件，
  焦点落到 `body`；Playwright 1.62.1 的 `LaunchOptions` 不支持
  `launchOptions.preferences`，WPE/Playwright WebKit 也未暴露该偏好设置。
  WebKit 下使用 Safari 支持的正常键盘方式 `Alt+Tab` 遍历全部控件。
- Chromium desktop/narrow 与 Firefox desktop 的普通 `Tab` 顺序保持原样。

修复边界：

- 两个场景均先等待真实任务按钮可见后再定位初始焦点。
- 使用最多 5 次的有界真实键盘遍历命中目标控件，允许跳过浏览器额外焦点停靠点，
  没有直接 `focus()` 目标，也没有删除 Tab 可达性断言。
- 命中后仍执行真实 `Enter` / `Space`，并保留动作次数、未提交外围表单、未选中行
  等断言。
- 未发现可归因于产品实现的焦点缺陷，因此未修改生产代码。

## 执行结果

命令（顺序执行，端口 4189）：

```text
bunx playwright test --config=./playwright.task-list.cross-browser.config.ts --reporter=line
bunx playwright test --config=./playwright.notifications.config.ts --reporter=line
```

### 任务列表（修复后）

- **36/36 通过**；6 个既有任务场景 × 6 个项目。
- 各项目均为 6/6：`chromium-desktop`、`chromium-narrow`、`firefox-desktop`、
  `firefox-narrow`、`webkit-desktop`、`webkit-narrow`。
- 两个此前失败的键盘场景在全部 6 个项目通过，同时保留真实焦点、Enter/Space
  动作、未提交表单与未选中行断言。
- 修复前红灯记录保持为：Firefox narrow 的额外滚动容器 Tab stop；WebKit
  desktop/narrow 普通 Tab 不进入按钮且无 Playwright preferences 入口。

### 通知设置

- **6/6 通过**；1 个既有通知设置场景 × 6 个项目，覆盖读取失败重试、单一错误
  归属、保存草稿保留和恢复保存。

## 影响与边界

- 主线程独立复跑（2026-10-24）：任务 cross-browser **36/36，exit 0，30.0s**；
  通知 **6/6，exit 0，9.9s**。独立结果不与 pi 的先行结果重复累计。
- 基础 `playwright.task-list.config.ts` 已恢复原项目数组，不再把 6 项目矩阵
  隐式扩散给其他继承配置；跨引擎矩阵只在专属 cross-browser 配置中生效。
- 本矩阵是本地 fixture 和受控 Provider，不等同于真实服务端、生产浏览器版本、
  读屏软件、触摸手势或发布包验收；WebKit 的 `Alt+Tab` 结果也不替代真实宿主
  全键盘访问设置下的人工检查。
- 自动生成的截图位于既有 `output/playwright/task-list` 与
  `output/playwright/notifications` 目录；本轮未逐张人工视觉检查。
