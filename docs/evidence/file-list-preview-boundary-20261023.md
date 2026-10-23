# FileList 预览渲染失败边界核对（B2-08）

- parent：`enterprise-ui-plan.md` 批次二 Upload / Dropzone / FileList；
  source：`enterprise-ui-acceptance-matrix-20261022.md` B2-08 下一项可执行动作。
- reason：矩阵要求核对“预览渲染失败后的行级恢复与同行互斥”，先确认该失败
  是否由 FileList 负责，避免把 `onpreview` 回调拒绝冒充真实预览渲染失败。
- Delegation Decision：low / managed，单一 writer 只读核对 + 单文件回归；
  主线程独立复核结果见下文。未 commit / push / deploy。
- 状态：只读核对与既有用例回归完成，未发现 FileList 生产缺口，本轮未改
  `FileList.svelte`、`FileListRow.svelte`、测试或 fixture。

## 核对结论：预览渲染由宿主负责

- `packages/ui/src/components/content/FileList.svelte` 只接收 `files`、状态文案和
  `ondownload` / `onpreview` / `onremove` 回调，按行渲染 `FileListRow`；不存在
  预览对话框、iframe、图片、URL 打开或任何渲染引擎。
- `packages/ui/src/components/content/FileListRow.svelte` 的预览按钮仅调用
  `await onpreview(file)`，等待 Promise，拒绝时写入行内通用错误，结束当前行
  pending；没有预览内容或渲染生命周期。
- `packages/ui/src/components/DetailWorkspaceSections.svelte` 的附件区只传
  `files`，不传 `onpreview`，进一步说明预览不属于 FileList 内部能力。
- 因此“预览渲染失败”是宿主预览器的状态，FileList 无法观察；宿主若要在本
  组件内表达该失败，唯一契约通道是让 `onpreview(file)` 返回的 Promise 拒绝。
  组件不自行新增预览引擎、URL 打开或渲染重试。

## 既有证据已覆盖该通道

`packages/ui/src/components/content/file-list.test.svelte.ts` 的
`action contract` 用例以 `Preview`、`Download`、`Remove` 参数化：

- 等待期间同一行三个入口全部禁用、其他行仍可用；
- 拒绝/同步抛错只显示通用错误，不泄露原始异常，入口恢复后可再次操作；
- 文件对象或处理器替换后旧回执不覆盖新行，同 ID/重复 ID、重排和卸载
  后的迟到回执均有隔离断言。

`scripts/fixtures/enterprise-ui/file-list.spec.ts` 以真实消费者入口覆盖
Preview 的键盘触发、同行互斥、跨行独立、失败重试、`aria-describedby`、
迟到回执和外层表单不被提交。上述断言验证的是 FileList 对宿主回调失败的
反应，不是宿主预览器的渲染实现。

## 本轮执行

```sh
cd packages/ui
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/content/file-list.test.svelte.ts
# Test Files 1 passed (1); Tests 26 passed (26); exit 0

cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.file-list.config.ts -g "Preview" --max-failures=1
# 6 passed (8.0s); exit 0
```

- 浏览器场景为 Chromium / WebKit / Firefox × 1440×1000 / 390×844，均只断言
  FileList 对本地 Promise 失败的行级反应，不包含真实预览渲染器。
- `git diff --check` 单独记录于本轮执行汇总。

### 主线程独立复核

- 主线程 FileList 单文件：**26/26 passed、exit 0、6.16s**。
- 主线程 Preview 定向浏览器矩阵：**6/6 passed、exit 0、8.7s**，覆盖
  Chromium/WebKit/Firefox 的桌面与窄屏；与 pi 结果分开记录。
- 主线程 `git diff --check`：exit 0。

## 仍未验收

- 真实预览渲染器、签名 URL、对象存储、服务端删除/审计、权限与租户隔离。
- 预览器在 `onpreview` resolve 之后异步渲染失败时的宿主反馈；该场景需要宿主
  暴露自己的失败通道，不能由 FileList 推断。
- 屏幕阅读器软件、上述三引擎之外的浏览器、消费者发布包与生产部署。
