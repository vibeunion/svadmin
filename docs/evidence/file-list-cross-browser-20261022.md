# FileList 真实消费者跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二 Upload / Dropzone / FileList
- source: 用户继续完善企业级规范；reason: FileList 已完成组件级契约，补齐真实源码
  消费者入口和跨浏览器回归
- scope: `scripts/fixtures/enterprise-ui/?view=files`、FileList 公开回调入口、
  桌面/390px 窄屏、Chromium/WebKit/Firefox
- Delegation Decision: low / managed；缺少 adaptive 所需的运行时证据，按 managed
  低风险任务由主线程单写入并执行确定性验证；本轮不修改生产组件，不调用外部复核。
  不提交、推送、发布或部署。

## 验收约定

Given 宿主提供异步附件操作，When 键盘触发并发生失败，Then 只锁定当前行、
错误不泄露原文、可重试且不提交外层表单。

Given 旧操作尚未完成，When 文件对象替换并发起新操作，Then 旧回执不能清除
新操作的等待状态；唯一 ID 重排与重复 ID 并存分别遵循既有身份契约。

## 结果

- 组件定向测试：`packages/ui/src/components/content/file-list.test.svelte.ts`
  **26/26**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.file-list.config.ts --max-failures=1
  ```

- 浏览器结果：**36/36**，退出码 0。
- 覆盖矩阵：Chromium、WebKit、Firefox × 1440px 桌面、390px 窄屏。
- 每种操作均覆盖 Preview、Download、Remove 的键盘 Enter/Space 触发；等待期间
  同行三个入口全部禁用，其他行仍可用；失败显示通用错误并允许重试；错误通过
  `aria-describedby` 关联到当前行；宿主表单不会被附件按钮误提交。
- 额外覆盖文件对象替换时旧 Resolve/Reject 不得解除新操作锁定，以及重排后行锁定、
  重复业务 ID 两行并存且错误/等待状态不串行。
- 六个浏览器项目的三个操作场景均监听 `pageerror`，结果为空；这些场景同时
  检查文档无横向溢出。替换和重排场景未单独断言 `pageerror`。
- 代表性截图保存在 Playwright `test-results/` 产物中，未纳入源码。

## 边界

- 夹具使用本地可控 Promise，不是真实下载签名、预览渲染器、对象存储、服务端删除
  或审计系统。
- DOM role、label、`aria-*` 属性和键盘自动化不等同于屏幕阅读器软件认证。
- 本轮不证明服务端幂等、并发冲突、权限/租户隔离、跨标签页恢复、消费者发布包或
  生产部署。
- `git diff --check` 通过；未执行全仓测试或发布流程。
