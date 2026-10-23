# ImportDropzone 导入交互契约

## 续接约定

- parent：`enterprise-ui-plan.md` 批次二上传；source：用户继续完善；
  reason：选择自动导入和确认按钮重复派发、没有拖放路径、原生输入缺少名称。
- 保留选择即导入的公开行为，拖放沿用同一校验路径；Promise 处理中锁定，
  错误可重试，同文件可重新选择；处理器替换及卸载隔离旧回执。
- 新增 `multiple` 默认为 false；保持 onimport 的 FileList/null 参数和 void
  兼容签名，运行时等待宿主返回的 Promise。不实现文件解析、后台任务、持久化或存储授权。
- 主线程唯一写入，Bohr 唯一只读复核，medium / managed。
- 范围：ImportDropzone、单文件回归、此证据、路线图与迁移说明；
  续接：校验文案统一接入 core 现有中英文翻译字典，仅新增两个 key。
  不改 FileList、公共 Input、颜色与布局体系或其他脏文件。
- 状态：本地实现、定向测试、Chromium 验证与独立复核完成；
  不提交、推送、发布或部署。

## 验收

```gherkin
Given 有导入处理器
When 选择或拖放有效文件
Then 自动派发一次，无第二个重复确认入口

Given 单文件限制或 accept
When 输入或拖放不符合约束的文件
Then 显示错误且不调用处理器，不静默导入部分文件

Given Promise 导入处理中或宿主 loading
When 再次选择或拖放
Then 不重复派发；失败只显示通用错误并允许显式重试

Given 旧处理器仍未完成
When 更换处理器或卸载
Then 旧结果不覆盖新 pending/error 状态，不伪装服务端取消
```

## 实现与证据

- 修复前代码核对：文件选择调用 `onimport`，随后确认按钮仍会再次调用；
  未注册拖放回调，异步处理没有组件级锁，原生文件输入没有可访问名称。
  本轮未对原始实现运行完整失败回放，不将代码核对称作浏览器缺陷回放。
- 现实现保留选择即导入的兼容语义；删除重复确认按钮。选择和拖放都复制为
  独立 `FileList`，统一执行扩展名/MIME 和数量校验；校验失败不调用宿主。
- `multiple` 默认为 `false`。Promise 处理期间 `aria-busy`、状态文案和禁用入口
  同步；失败不展示异常详情，只保留通用错误和 `Retry` 按钮；重试使用同一批
  文件。处理器 identity、attempt 计数和卸载标记共同隔离迟到结果。
- `accept` token 会先去除空白和空 token；尾逗号不会把空 MIME 文件误判为合法。
  宿主在回调内同步触发第二次 change 时，pending 锁保证 exactly-once。
- 原生 `Input` 由 `@svadmin/core/i18n` 提供名称；新增两条中英文校验文案。
  外层使用 group 语义，不再制造嵌套 button；重试按钮明确为 `type=button`。

在 `packages/ui` 运行：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/content/import-dropzone.test.svelte.ts
```

- 最终定向测试 **21/21**，退出码 0；覆盖空 accept token、同步重入、
  错误重试和旧处理器隔离。`git diff --check` 通过。
- Chromium 1440x900、390x844：每个视口 6 条路径，共 **12/12**，`pageErrors: []`。
  覆盖原生 `FileList`、拖放、重复选择、拒绝、异步锁定、键盘 Retry、旧处理器
  隔离、中英文标签和窄视口无溢出。
- 已查看 `output/playwright/import-dropzone-contract-20261021/selected-1440.png`
  和 `recovery-390.png`。已选小样本处理完后原生输入恢复，文字和控件未见重叠。
- 测试页只调用本地 fixture，不连接真实导入接口。启动时的 favicon 404 不属于
  组件页面错误；临时浏览器和 4205 服务验证后关闭。
- Bohr 初次复核发现 `accept` 尾逗号与空 MIME 的 P2，已过滤空 token 并新增
  输入/拖放回归；同步重入也补了 exactly-once 用例。最终复核确认无明确
  P0/P1/P2 阻塞。

## 尚未覆盖

- FileList 下载/移除/预览闭环、服务端任务持久化、进度和失败报告仍待后续。
- 未验证 Firefox/WebKit、读屏、真实导入接口、文件解析安全、权限和跨租户隔离。
- `onimport` 仍为宿主边界；组件不宣称服务端已提交、可回滚或已持久化。
