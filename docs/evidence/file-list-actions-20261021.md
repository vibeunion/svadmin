# FileList 附件操作契约

## 续接约定

- parent：`enterprise-ui-plan.md` 批次二 Upload / Dropzone / FileList；
  source：用户继续完善；reason：当前下载/移除没有等待、失败反馈或重复调用保护，
  缺少宿主控制的预览入口。
- 目标：预览、下载、移除统一按行互斥；独立文件可并行；失败只显示通用信息；
  数据与处理器变化、状态页切换、卸载后旧回执不更新新行。
- 保留原有 FileItem 与回调兼容签名，新增可选 `onpreview`；运行时等待 Promise。
  文件列表始终由宿主控制，不自动删除、不自动重试、不直接打开 URL、不实现
  文件渲染引擎、持久化、确认弹窗或存储鉴权。
- Delegation Decision：medium / managed，主线程唯一 writer，Bohr 唯一只读复核。
- 范围：FileList、内部 FileListRow、单文件定向测试、中英文操作文案、
  本证据与现有迁移说明/路线图入口。不修改公共 Button/DataState 或其他既有脏文件。
- 状态：本地实现、定向测试、Chromium 验证与独立复核完成；
  不提交、推送、发布或部署，不关闭整体企业级目标。

## 验收场景

```gherkin
Given 同一附件有预览、下载与移除入口
When 任一操作仍在等待宿主 Promise
Then 该行全部入口禁用且显示等待状态，其他行仍可操作

Given 操作抛出错误或 Promise 拒绝
When 组件接收当前操作的失败
Then 显示通用错误，恢复入口，允许用户重新操作，不显示原始异常或自动重试

Given 旧附件操作尚未完成
When 文件对象、处理器或内容状态变化
Then 旧回执不会覆盖新行的 pending/error 状态

Given 宿主未提供操作或指定 loading/forbidden/error 状态
When 列表渲染
Then 不出现不可执行或越过状态的附件入口；空态文案不覆盖错误与权限反馈

Given 移除操作成功返回
When 宿主尚未更新 files
Then 组件仍展示原附件，不把回调完成视为文件已删除的证明
```

## 实现与证据

- 原实现只在存在回调时显示同步按钮，不能防重复点击、不能表示异步等待、
  没有错误反馈，也没有预览入口；文件项没有自行消费 URL，这条安全边界保留。
- FileList 现在把每个文件拆为独立 `FileListRow`。预览、下载、移除均由宿主
  回调执行；同一行任一操作 pending 时整行锁定，其他行仍可操作。回调返回
  Promise 时等待完成，拒绝或同步抛错只显示通用错误，入口恢复后允许再次操作。
- 行引用、操作回调、attempt generation 和卸载状态共同隔离迟到回执；外部
  `files` 尚未移除前，组件不自行删除文件。显式 `loading/error/forbidden/empty`
  等 DataState 优先于文件操作。
- keyed rows 现在为有 `id` 的记录增加出现次序，允许重复业务 ID 共存；无 ID
  记录继续使用出现位置。key 使用 JSON 结构编码，避免 ID 中的分隔符与其他
  记录碰撞，不对附件做隐式去重。
- 修复前 Chromium 走查发现 390px 视口长 MIME 文本越过文本列并压到操作图标；
  元数据现允许长词换行，操作按钮保持稳定尺寸。

在 `packages/ui` 运行：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/content/file-list.test.svelte.ts
```

- 重复 key 修复后定向测试 **25/25**，退出码 0；`git diff --check` 通过。
- 故障回放：临时恢复旧的 `id:${file.id}` key 后，重复 ID 用例直接触发
  Svelte `each_key_duplicate`；恢复出现次序 key 后 25/25 通过。
- Chromium 1440x900、390x844：每个视口 6 条路径，共 **12/12**，`pageErrors: []`。
  覆盖独立行操作、按行 pending、通用失败与重试、状态页优先级、中英文名称、
  长文件名/MIME 换行和窄视口无横向溢出。
- 已查看 `output/playwright/file-list-actions-20261021/ready-1440.png`、
  `error-390.png` 和 `long-390.png`。浏览器夹具只调用本地宿主回调，不连接真实
  下载、预览、对象存储或删除接口；临时服务和浏览器验证后关闭。
- Bohr 最终只读复核未发现明确 P0/P1/P2 阻塞；确认长 MIME 换行与按钮防收缩
  局限在行内、回调签名保持旧消费者兼容。真实权限、存储或跨浏览器仍未宣称验收。

## 尚未覆盖

- 未验证真实下载签名、预览渲染器、服务端删除确认、审计记录、权限/租户隔离。
- 未验证 Firefox/WebKit、读屏以及消费者发布构建。
- 不把宿主回调 resolve 解释为服务端持久化或删除成功，继续由宿主提供结果证据。

## 重复身份续接记录

- parent/source: 本文 FileList 操作契约 / 用户继续完善企业级规范请求。
- reason: 服务端或目录合并可能返回重复业务 ID；旧 keyed each 会产生重复 key，
  使渲染中止，且不能把重复记录之间的身份关系擅自推断为相同文件。
- scope: 仅 `FileList.svelte` 行 key 和本文件定向测试；不改 FileItem、回调或
  FileListRow，不宣称无 ID 记录跨重排稳定。
- Given 同一批数据包含重复 ID，When 渲染并分别执行异步操作，
  Then 两行保留且 pending/error 只作用于对应出现位置。
- Delegation Decision: medium / managed，主线程唯一 writer，Bohr 只读复核。
- Bohr 未发现 P0/P1 或确定的生产阻断，但指出 P2 身份边界：重复 ID 的出现
  次序不是真实文件身份，不能保证重排后原对象的 pending/error 随行迁移。
  本轮不推断重复 ID 之间的身份，也不保证无 ID 行跨重排稳定。
- 重复 ID 重排按行 file 引用变化清理旧状态；新增回归检查新行等待期间，
  原行迟到失败不覆盖新行。调用者若需要重排时保留等待状态，应提供唯一 ID。
  本地等待状态的清理并不取消宿主已经发出的操作。补充该回归后，单文件
  最终 **26/26**。
- Chromium 12/12 是此前附件动作场景证据，未重新验证本轮重复 key 场景；
  真实服务端、权限、读屏和跨浏览器仍未验收。
