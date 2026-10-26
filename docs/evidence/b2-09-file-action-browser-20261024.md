# B2-09 文件动作反馈真实浏览器证据（2026-10-24）

## Task Contract

- parent: `docs/evidence/b2-09-composite-followup-20261024.md`
- source: 用户要求为上一轮 `FileUpload` / `FileUploadField` 动作按钮新增的
  `aria-describedby` / `aria-invalid` 补充真实浏览器键盘证据，不重复 DOM 单测。
- reason: 上一轮只证明组件/DOM 关联；尚未证明真实 `AutoForm` 字段错误下，
  键盘 Tab/Shift+Tab 能实际到达队列 cancel、retry、remove 与既有附件 remove，
  并解析到当前字段的真实说明/错误。
- orchestration: managed；medium；pi 为唯一 writer；主线程独立验收。
- goal: 仅用真实 fixture + `AutoForm` + TypeBox contract 诱发附件字段必填错误，
  在真实浏览器中证明动作可达、反馈关联、取消/重试/移除结果和成功后错误清理及
  精确引用载荷。
- non-goals: 不改生产组件；不新增 DOM 单测；不伪造 AutoForm 内部 error API；
  不扩大 390px 视口范围；不新增移动场景；不跑全仓；不提交、推送、发布或部署。
- workspace: 保留所有 dirty；仅改
  `scripts/fixtures/enterprise-ui/AutoFormUploadBrowserFixture.svelte`、
  `scripts/fixtures/enterprise-ui/autoform-upload.spec.ts`、
  `scripts/fixtures/enterprise-ui/playwright.autoform-upload.config.ts`（仅在已证
  Firefox/Chromium 需要时）、本证据文档。

## Gherkin

```gherkin
Scenario: 真实 AutoForm 必填错误下键盘可达既有附件移除
  Given 编辑表单回显既有附件且附件字段必填并带说明
  When 用户从标题键盘 Tab/Shift+Tab 到达既有附件移除按钮并移除
  And 用户提交表单触发真实附件必填错误
  Then 移除按钮的真实可访问描述解析到字段说明
  And 字段错误真实出现且未发生写入

Scenario: 待上传与重试动作关联真实字段反馈
  Given 附件事实错误存在且上传处于 pending
  When 用户键盘 Tab/Shift+Tab 到达 cancel 并取消
  And 用户键盘 Tab/Shift+Tab 到达 retry 并重试
  Then 每个动作的真实可访问描述解析到字段说明与当前错误
  And aria-invalid 跟随当前字段 invalid 状态
  And pending 期间直接提交仍不产生写入

Scenario: 队列移除与成功后清理
  Given 取消后的队列项仍关联当前字段错误
  When 用户键盘到达 remove 并移除队列项
  Then 队列项消失且错误仍在、无写入
  When 上传成功并保存
  Then 字段错误被清理
  And 写入载荷只包含精确的 JSON 附件引用
```

## 证据边界

- 只证明 Chromium/WebKit/Firefox 真实浏览器中的键盘焦点、可访问描述解析和
  组件结果；不证明真实读屏播报。
- 只使用真实 `AutoForm` 暴露给 `FieldRenderer` 的 `invalid` / `errorId` 宿主
  路径，不读取或伪造 AutoForm 私有错误 API。
- 不证明真实上传服务、服务端错误映射、Provider/RBAC、发布或部署。

## 执行记录

### 实施

- `AutoFormUploadBrowserFixture.svelte`：附件在 TypeBox create/update 合同和
  字段元数据中改为必填，并新增真实字段说明
  `Attach the signed quarterly report.`。未新增宿主注入的 `invalid` /
  `errorId`，错误由真实 `AutoForm` 校验和字段错误渲染产生。
- `autoform-upload.spec.ts`：保留原有 3 条业务用例，新增 2 条键盘证据用例。
  既有附件 remove、队列 cancel/retry/remove 均从标题输入框用真实浏览器
  遍历键到达，不使用 `focus()`、不对目标按钮 `locator.press`、不 force click。
  反馈关联用 Playwright `toHaveAccessibleDescription` 解析真实
  `aria-describedby`，并检查 `aria-invalid`。
- macOS WebKit 未开启全键盘访问时，沿用仓库既有约定使用
  `Alt+Tab` / `Alt+Shift+Tab` 遍历全部控件；其余引擎使用
  `Tab` / `Shift+Tab`。这只是 Safari 的正常键盘遍历方式，不是直接聚焦目标。
- `playwright.autoform-upload.config.ts` 未改，继续保留 Chromium/WebKit/Firefox
  × 1440/390 的 3×2 项目；本轮不需要追加 Firefox 代理或 Chromium
  `--no-proxy-server` 参数。
- 未修改生产组件，未新增移动场景。

### 验证（pi 自测）

均从 `scripts/fixtures/enterprise-ui` 运行，复用配置的 fresh 4197 webServer；
未触碰 5187 预览，结束后 4197 无监听进程。

| 命令 | 结果 |
| --- | --- |
| `bunx playwright test --config playwright.autoform-upload.config.ts --project=chromium-desktop --reporter=line -g "required attachment feedback"` | **1/1 passed**，exit `0` |
| `bunx playwright test --config playwright.autoform-upload.config.ts --project=chromium-desktop --reporter=line -g "cancelled queue item"` | **1/1 passed**，exit `0` |
| `bunx playwright test --config playwright.autoform-upload.config.ts --reporter=line -g "required attachment feedback|cancelled queue item"` | **12/12 passed**（2 条新用例 × 3 引擎 × 2 视口），24.4s，exit `0` |
| `bunx playwright test --config playwright.autoform-upload.config.ts --reporter=line` | **30/30 passed**（5 条用例 × 3 引擎 × 2 视口），40.3s，exit `0` |
| `bunx eslint --max-warnings 0 scripts/fixtures/enterprise-ui/AutoFormUploadBrowserFixture.svelte scripts/fixtures/enterprise-ui/autoform-upload.spec.ts` | exit `0`，0 警告 |
| `git diff --check` | exit `0` |

新用例覆盖的具体结果：

- 既有附件 remove 通过正向遍历和回退键真实到达，移除后附件列表消失，
  Save 触发真实必填错误，写入计数保持 `0`。
- 上传 pending 时 Save 禁用，标题输入框 Enter 不产生写入；cancel 到达后
  取消结果为 `cancelled`，记录 `"reason":"cancel"` 与
  `"uploadId":"pending-session-1"`。
- retry 到达后重新进入 pending，完成后成功状态出现；保存只写
  `{"url":"/uploads/session-2.pdf","uploadId":"pending-session-2"}`，
  字段错误与错误摘要均清理，写入/成功计数各为 `1`。
- 取消后的队列 remove 通过键盘到达并移除队列项；字段错误仍在，
  Save 重新可用但不写入，`write-count=0` 且 `last-write=No write`。

### 证据边界

- 主线程独立复核：仅新增两条场景的三引擎两视口矩阵 **12/12**，
  exit 0，23.5s。命令：
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform-upload.config.ts --grep 'required attachment feedback|cancelled queue item' --output=output/playwright/b2-09-file-action-browser-20261024 --reporter=line`。
  两目标文件 ESLint `--max-warnings 0` 与 `git diff --check` 均通过。
  未把实施端全 spec 30/30 计作主线程独立结果，未合并两次计数。
- 主线程已检查新场景不使用 `focus()`、目标 `locator.press()`、force click
  或内部错误注入；标题点击只用于建立键盘遍历起点，目标动作以真实按键到达
  并用 `toBeFocused` 确认。旧三条业务测试未删除、未降低断言。
- 本轮走的是真实 `AutoForm` 给 `FieldRenderer` 的公开 `invalid` / `errorId`
  宿主路径；字段说明来自 `field.description`，错误节点由 AutoForm 渲染。
  没有读取或伪造 AutoForm 私有错误 API。
- `toHaveAccessibleDescription` 证明浏览器可访问描述对真实 DOM IDREF 的解析，
  不等于真实读屏播报；仍不证明真实上传服务、服务端错误映射、Provider/RBAC、
  发布或部署。
