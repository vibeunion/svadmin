# FileUpload 文案与错误反馈

## 续接约定

- parent: `file-upload-field-feedback-20261021.md` 与
  `file-upload-native-contract-20261021.md`；source: 用户继续完善企业级规范。
- reason: 上传操作名称、状态和校验原因存在硬编码英文；上传异常会直接展示
  宿主异常文本，可能泄露签名 URL、服务端内部信息或实现细节。
- goal: 上传界面文案随 i18n scope 切换，错误区始终使用通用提示；保持
  `UploadItem.status/error` 与 `onReject(file, reason)` 的既有机器契约。
- scope: `FileUpload.svelte`、core upload i18n keys、上传单文件测试、本文与路线图。
- non-goals: 不修改上传协议、取消/重试时序、原生 FormData、服务端清理或存储。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收

1. Given 已选文件，When 切换语言，Then 列表名称、状态、操作 aria-label/title
   更新，不重新上传、不增加 `onChange` 调用，原生文件仍保留。
2. Given 类型、大小或数量校验拒绝，When 切换语言，Then 可见原因翻译，
   `onReject` 仍收到原英文 reason，回调只触发一次。
3. Given 上传 Promise 使用私有错误、空错误或非 Error 值拒绝，
   When 展示失败，Then 只显示通用本地化文案，不显示原始异常；重试仍可成功。
4. Given 上传被取消，When 切换语言，Then 保留 `cancelled` 机器状态和原始
   `UploadItem.error`，可见状态与提示本地化。

## 验证

- `bunx vitest run src/components/file-upload.test.svelte.ts`：**36/36**。
- `bunx vitest run src/components/file-upload-lifecycle.test.svelte.ts`：**9/9**。
- 覆盖中英文切换、原生文件保持、错误脱敏、空错误、重试、取消和既有回调契约。
- 补强后再次 36/36：英文与中文状态下均断言组件 HTML 不包含私有错误；断言
  `onChange` 对 Error 保留原 message，非 Error 保留既有 `Upload failed.`。
- Bohr 只读复核未发现已确认 P0/P1/P2，建议的回调兼容与 HTML 检查已补充。
- `git diff --check` 通过。
- 未覆盖真实浏览器、读屏、真实存储服务、消费者发布构建；不将本地 i18n scope
  证明外推为完整国际化认证。

## 边界

- `UploadItem.error` 保留原诊断值（可能含私有信息），`onReject` reason 保持
  原英文机器值。宿主不得把原诊断值当作已经脱敏的用户文案，本轮只保护组件
  自身的展示层，不改变公开回调协议，也未新增展示层 API。
- 组件只对内置已知 reason 做翻译，未知 reason 使用通用失败文案。
