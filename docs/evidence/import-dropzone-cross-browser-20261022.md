# ImportDropzone 真实消费者跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二 Upload / Dropzone / FileList
- source: 用户继续完善企业级规范；reason: ImportDropzone 已完成本地交互契约，
  补齐真实源码消费者和跨浏览器回归
- scope: `scripts/fixtures/enterprise-ui/?view=import`、原生 file input、
  Chromium/WebKit/Firefox、1440px/390px
- Delegation Decision: low / managed；主线程单写入并执行确定性验证，未修改生产
  组件，不提交、推送、发布或部署。

## 验收约定

Given 处理器存在，When 用户选择有效文件，Then 只派发一次并锁定后续选择；
宿主 Promise 完成后恢复入口，不提交外层表单。

Given 文件类型不符合约束或处理器失败，When 用户再次操作，Then 类型拒绝不调用
处理器，失败只显示通用文案并允许 Retry，重试仍使用原文件。

Given 旧处理器仍在等待，When 处理器被替换并开始新导入，Then 旧 Resolve/Reject
不能清除新导入的 pending/error 状态。

## 结果

- 组件定向测试：`packages/ui/src/components/content/import-dropzone.test.svelte.ts`
  **21/21**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.import-dropzone.config.ts --max-failures=1
  ```

- 浏览器结果：**18/18**，退出码 0。
- 覆盖矩阵：Chromium、WebKit、Firefox × 1440px 桌面、390px 窄屏。
- 覆盖有效 CSV 选择、等待期间重复选择、完成恢复、TXT 类型拒绝、私有异常脱敏、
  Retry 键盘触发、原文件重试、处理器替换后的旧回执隔离和宿主表单不误提交。
- 失败恢复场景检查 `pageerror` 为空，窄屏检查文档无横向溢出。
- `git diff --check` 通过；截图保存在 Playwright `test-results/` 产物中，未纳入源码。

## 边界

- 夹具使用本地可控 Promise，不是真实导入 API、文件解析器、后台任务、持久化、
  对象存储或权限服务。
- DOM role、`aria-busy`、键盘自动化不等同于屏幕阅读器认证。
- 本轮不证明服务端幂等、并发冲突、权限/租户隔离、跨标签页恢复、消费者发布包
  或生产部署。
