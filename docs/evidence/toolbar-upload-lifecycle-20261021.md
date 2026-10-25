# 富文本工具栏上传生命周期

## 任务约定

- parent：`richtext-field-contract-20261021.md`；source：用户继续完善。
- reason：工具栏 ImageUpload 尚未隔离关闭、禁用或实例重建后的异步回执。
- goal：仅当前弹层、编辑器实例和上传处理器的请求可以写入内容；阻止重复提交。
- scope：ImageUpload、既有富文本定向测试、本文及上轮证据的状态续接。
- 非目标：嵌套数组提交、上传服务取消/清理、失败提示和重试体验、布局或主题改造。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- 不提交、推送、发布或部署。使用现有工作树，保留其他改动。

## 验收

```gherkin
Given 工具栏图片上传正在进行
When 再次选择或拖放文件
Then 不发起并发请求，上传入口标记 busy 和 disabled

Given 图片上传尚未返回
When 关闭弹层、禁用、切换只读、重建编辑器、卸载或替换上传处理器
Then 旧回执不插入图片，不继续上传队列中的后续文件

Given 旧上传已经失效且新上传正在进行
When 旧请求完成
Then 不清除新上传的忙碌状态，也不关闭当前弹层

Given 当前图片上传成功
When 回执返回且编辑器仍可编辑
Then 插入一次图片并关闭弹层
```

## 本地证据

- `cd packages/ui && bun run test src/components/richtext-field-contract.test.svelte.ts`：
  31/31 通过；本轮新增 11 个工具栏场景，原 20 个富文本契约同时通过。
- 测试运行真实 Tiptap 和 Svelte 组件，环境为 DOM 模拟器，不是真实浏览器。
- 请求绑定组件生命周期及 editor/onUpload 代际；旧请求 finally 不影响新请求状态。
- 上传中的文件输入禁用，拖放/点击/键盘入口均有重复请求保护。
- Bohr 只读复核指出上传中切换 URL 模式仍可能接收旧回执；已禁用忙碌期间的
  两个模式按钮，并增加对应断言。
- 编辑器包构建及 `git diff --check` 通过。
- 失败仍沿用原有日志及关闭行为；没有宣称完成错误提示或重试设计。
- 已发出的服务端上传不会被取消，可能产生未引用文件；本轮只隔离客户端写入。

真实浏览器、读屏、后端上传及文件清理、消费者发布验收仍未完成。

后续失败恢复已在 `toolbar-upload-retry-20261021.md` 单独推进：
失败不再关闭面板或输出原始异常，提供剩余队列的显式重试。
上面的“失败仍沿用原有日志及关闭行为”仅是本任务完成时的历史状态。
