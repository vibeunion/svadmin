# FileUpload 原生表单一致性契约

## 续接约定

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二 Upload / Dropzone / FileList；
  source：用户继续完善企业级实用性；reason：原生模式的可见队列与 `input.files`
  使用不同状态源，拖放、分批选择、拒绝与移除存在提交不一致的代码路径。
- 目标：无异步 `upload` 时，文件输入与拖放共用校验和队列，原生 `FormData`
  仅包含已接收、未移除的文件；非法文件不消耗可用数量。
  续接原因：同步队列后必须同时处理原生表单 reset，避免下次选择恢复已重置附件；
  此边界仍属于同一原生提交契约，编排和写入范围不变。
- 非目标：不修改上传会话、回收协议、Provider、样式、公共 Props、ImportDropzone
  或 FileList；不把前端校验作为服务端授权、内容校验或持久化成功的证明。
- 写入范围：`FileUpload.svelte`、`file-upload-native.test.svelte.ts`、本证据、
  迁移说明与路线图入口；临时浏览器 fixture 和证据仅放在忽略的 output 目录。
- Delegation Decision：medium / managed；主线程唯一写入，Bohr 唯一只读复核。
  当前工作区没有 `.agents/state/coordination.json`，以本约定记录范围与执行状态。
- 状态：本地实现、定向测试、Chromium 验证与独立复核完成；
  保留全部既有脏改动，不提交、推送、发布或部署。

## 验收场景

```gherkin
Given 原生多文件表单有类型、大小和数量限制
When 通过文件输入或拖放加入混合有效与无效文件
Then 只接收符合条件的文件，无效文件不占名额，FormData 与列表一致

Given 已接收一批文件
When 再次选择或拖放，随后移除其中一个
Then FormData 包含所有剩余文件，不丢失上一批或未移除的文件

Given 原生单文件表单已经有合法附件
When 新选择的文件被校验拒绝
Then 原有附件与 FormData 保持一致，不提交被拒绝的替换文件

Given 原生必填文件字段
When 拖入有效文件或移除最后一个文件
Then 原生 required 校验分别满足或缺失，onChange 时提交内容已与队列一致

Given 提供了异步 upload 回调
When 选择或拖放文件
Then 仍通过异步会话上传，不恢复原生 name 或重复 multipart 提交

Given 原生表单有已选附件
When 表单重置，或监听器阻止重置
Then 前者清空队列和拒绝提示，后者保留；同栈重新选文件不恢复旧附件
```

## 基线

- 在 `packages/ui` 运行
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/file-upload.test.svelte.ts`：
  28/28，退出码 0。该文件尚未证明原生 FormData 的上述交互路径。
- ImportDropzone 目前仅有选择回调；FileList 仅把下载与移除委托给宿主，
  不直接使用 Provider URL。本轮不将两者或整个上传能力标记为已验收。

## 实现与验证

- 原生队列通过 `DataTransfer` 同步到 `input.files`，不手工构造文件内容或隐藏
  文件名字段。更新队列后先同步原生输入再发送 `onChange`；新选择开始时先恢复
  已接收队列，确保被拒绝文件不会残留在原生提交里。
- 接收路径先校验类型和大小，再判断数量。单选批次接收首个合法文件，多选按
  当前队列剩余容量接收；每个拒绝条目仍保留原因和 `onReject`。
- 原生 reset 监听仅绑定当前所属表单，无异步 `upload` 时生效；等待事件分发
  完成后确认 `defaultPrevented`，清除队列和拒绝提示。下一次接收前会先处理待
  完成的 reset，避免同一调用栈内重置后又恢复旧附件；卸载后不发送通知。
- 失败回放实际观察到：原生 FormData 包含被拒绝文件、拖放没有对应文件、
  分批选择丢失旧批次，以及无效替换提交了被拒绝的新文件。
  初版测试直接挂载在 form 上还出现模拟环境的重复 change 分发，已改为表单内
  独立 div 挂载；不把该测试容器现象计作组件缺陷。
- 在修复重置前，校正后的 21 项测试有 2 项失败，明确复现普通 reset 未清空队列、
  同栈 reset 后重新选择恢复旧附件。
- 真实 Chromium 首次走查也发现 `queueMicrotask` 处理 reset 时事件分发可能
  尚未结束，导致队列未清空；改为下一任务收尾后，重跑浏览器矩阵通过。

在 `packages/ui` 分别运行以下单文件，退出码均为 0：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/file-upload-native.test.svelte.ts
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/file-upload.test.svelte.ts
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/file-upload-reentrancy.test.svelte.ts
```

- 新原生契约测试最终 **22/22**；既有主测试 **28/28**、重入测试 **5/5**。
  最后对这三个直接相关文件合并运行一次，**55/55**、退出码 0。
  没有运行全仓测试、包级类型检查、构建或发布门槛。
- Chromium 1440x900、390x844：每个视口 7 条路径，共 **14/14**，
  `pageErrors: []`。核对 `FormData` 中的文件名和文本字节，不只是列表或通知计数。
  提交被本地 fixture 拦截，未向对象存储或生产接口发送文件，不是线上上传验收。
- 浏览器脚本：
  `output/playwright/file-upload-native-contract-20261021/verify.js`；
  已查看 `queue-1440.png`、`rejections-390.png`，本次短文件名队列与拒绝提示
  没有重叠；没有修改产品布局，也没有宣称完整长文本或无障碍验收。
- 浏览器使用已有 Chromium 缓存和 CLI 配置；CLI 从 `/tmp` 运行以避开仓库
  npm overrides 解析差异。启动时有测试页 favicon 404，不是组件页面异常。
- Bohr 初次只读复核发现 P2：连续 reset 中，后一次取消会覆盖前一次已成功重置。
  监听器现先处理上一已完成的事件，再记录新事件；新增组合回归与真实浏览器
  路径，最终复核确认该 P2 关闭，没有明确新增 P0/P1/P2 阻塞。
- `git diff --check` 通过。临时浏览器和 4204 测试服务在验证后关闭。

## 尚未覆盖

- ImportDropzone / FileList 的操作闭环、统一语言与完整可访问状态仍需后续批次。
- 未验证 Firefox/WebKit、读屏、真实 multipart 接收端、存储回收、消费者构建、
  动态切换原生与异步模式或任意外部 DOM 重挂载。
- 不提交、推送、发布或部署，不关闭整体企业级规范目标。
