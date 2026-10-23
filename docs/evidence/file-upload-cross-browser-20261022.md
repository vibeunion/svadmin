# FileUpload 真实消费者跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二 Upload / Dropzone / FileList
- source: 用户继续完善企业级规范；reason: FileUpload 已有会话与生命周期单测，
  补齐真实源码消费者和三引擎浏览器回归
- scope: `scripts/fixtures/enterprise-ui/?view=upload`、文件 input、上传取消/重试、
  类型与大小校验、Chromium/WebKit/Firefox、1440px/390px
- Delegation Decision: low / managed；主线程单写入并执行确定性验证，未修改生产
  组件，不提交、推送、发布或部署。

## 验收约定

Given 上传处理器等待宿主 Promise，When 用户取消并重试，Then 当前项显示取消、
可显式重试，旧 Promise 的完成不能把新尝试改成成功。

Given 文件类型或大小不符合字段限制，When 用户选择文件，Then 只记录拒绝、
不启动上传，也不把异常写入页面。

## 结果

- 相关定向测试：
  `file-upload.test.svelte.ts`、`file-upload-lifecycle.test.svelte.ts`、
  `file-upload-native.test.svelte.ts`、`file-upload-reentrancy.test.svelte.ts`
  共 **72/72**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.file-upload.config.ts --max-failures=1
  ```

- 浏览器结果：**12/12**，退出码 0。
- 覆盖矩阵：Chromium、WebKit、Firefox × 1440px 桌面、390px 窄屏。
- 覆盖 44% 进度、取消与 cleanup 回调、Retry 键盘触发、旧上传 Promise 延迟完成、
  成功 URL 回显、类型/大小拒绝、上传次数为零和宿主表单不误提交。
- 失败场景监听 `pageerror` 为空，窄屏检查文档无横向溢出。
- `git diff --check` 通过；截图保存在 Playwright `test-results/` 产物中，未纳入源码。

## 边界

- 夹具使用本地可控 Promise，不是真实对象存储、multipart、服务端清理、幂等键
  持久化或权限服务。
- DOM role、`aria` 属性和键盘自动化不等同于屏幕阅读器认证。
- 本轮不证明并发冲突、权限/租户隔离、跨标签页恢复、消费者发布包或生产部署。
