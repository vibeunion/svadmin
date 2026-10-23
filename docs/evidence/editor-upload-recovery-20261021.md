# 编辑区图片上传失败恢复

## 续接约定

- parent：`toolbar-upload-retry-20261021.md`；source：继续完成原企业规范目标。
- reason：编辑区 drop/paste 未捕获上传失败，用户无法识别和重试。
- goal：每个图片任务提供进行中、通用失败、单项重试和本地移除；保留作用域隔离，
  插入位置随文档交易映射；正文被宿主替换时清除旧任务。
- scope：Editor、editor.css、既有富文本单文件契约测试和本文。
  消费者打包发现不可命名的 Props 后，必要修复扩展至编辑器入口的纯类型导出，
  不改变运行时 API。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- 非目标：服务端取消/删除/幂等、跨浏览器、真实读屏和完整上传性能验收；
  移除任务只阻止客户端写入，不宣称已取消服务端上传。
- 不提交、发布或部署，日常只运行直接相关单一文件及 diff 检查。

```gherkin
Given 拖放或粘贴图片
When 上传抛错或拒绝
Then 出现通用错误及单项重试，不泄露原始异常

Given 图片上传失败
When 重试或移除任务
Then 重试只执行一次；移除后的迟到回执不写入正文

Given 上传尚未完成
When 禁用、替换 handler、重建、卸载或宿主替换正文
Then 旧成功或失败均不修改新内容或新反馈

Given 上传过程中编辑器内文本变化
When 当前上传成功
Then 图片插入映射后的原始位置，不读取回执时的鼠标坐标或选区
```

## 本地证据

- `cd packages/ui && bun run test src/components/richtext-field-contract.test.svelte.ts`：
  当前 72/72，退出码 0。
- 新增 31 条覆盖：drop/paste 同步和异步失败、重试防重入、移除正在上传的任务、
  七种作用域变化后的迟到失败、编辑过程的插入点映射、粘贴原选区替换、
  多图只重试失败项、宿主正文替换后的迟到成功、追加交易映射和反序回执。
- 既有工具栏失败恢复、富文本字段语义和 drop/paste 生命周期在同一文件保留。
- 反馈按任务显示文件名、上传状态及通用错误；不把原始异常写到页面或控制台。
  文件输入和粘贴事件中的 File 引用在同步入口读取；失败重试不依赖原事件。
- `git diff --check` 和 `cd packages/editor && bun run build` 通过。
- Bohr 独立只读复核确认主/追加交易顺序映射及本地编辑后宿主替换两项 P2
  已关闭，当前范围未发现新增 P0/P1/P2。
- 追加交易用例使用真实 ProseMirror 插件，在主交易仅含 meta 时追加正文变化，
  明确断言图片前后为 `XA` / `B`。反序回执用例检查不同锚点的完整节点顺序。
- 宿主替换用例先复现本地编辑后 `value` 同步失效和旧上传污染；移除普通布尔锁，
  以 HTML 比较及 `emitUpdate:false` 防止回环后通过。
- 上传期间在原粘贴范围内编辑会将替换范围折叠为插入点，避免删除后续新输入。

这里的“移除”只是丢弃客户端任务及其回执，不会撤销服务端已开始的上传。
本次没有全仓类型检查、真实浏览器、读屏、上传服务或发布验收。

## 消费者检查续接

- `cd example && bun run build`：退出码 0。保留既有大 chunk 和 KaTeX
  动静态导入提示，不能据此推导浏览器或上传服务通过。
- `cd packages/ui && bun run build`：退出码 0，但声明生成报告
  `import.meta.env` 可移植性提示；此前 `LazyRichTextEditor` 引用私有 `Props`
  的声明警告已通过公开 `EditorProps` 修复后消失。
- `packages/editor/dist/components/Editor.svelte.d.ts` 当前公开
  `EditorProps`，组件声明以 `Component<EditorProps, {}, "value">` 生成，
  `packages/editor/dist/index.d.ts` 同步导出该类型。
- 示例构建与 UI 打包仍不是完整消费者发布验收，但本轮的编辑器公开声明门槛
  已通过；大 chunk、KaTeX 动静态导入和 `import.meta.env` 提示仍未处理。
- 以上最终构建按 editor → UI → example 顺序执行；类型导出后单文件回归
  再次为 72/72。Bohr 确认类型字段、可选性和 bindable value 未改变，
  没有新增运行时导出或明确 P0/P1/P2。

## 浏览器启动探针

- 示例 Vite 开发服务使用本机 5177 端口，其他已占用端口未终止或复用。
  探针结束后已关闭本轮服务，避免遗留后台进程。
- Playwright CLI 包装器遭仓库 npm override 解析错误阻断；未安装或修改依赖，
  使用仓库已有 Playwright Chromium 完成探针。
- 演示登录后等待主区域 Loading 消失，确认 Operations workspace、库存风险、
  订单和 Surface 内容出现，页面 JavaScript 异常列表为空。
- 1440×900 截图位于
  `output/playwright/editor-consumer-20261021/dashboard-ready.png`，
  已检查主内容、导航正常可见，没有发现明显文字重叠。
- 这是开发应用启动证据，不是生产构建预览，也没有通过示例入口操作富文本上传。
  因此不关闭编辑器真实浏览器、跨浏览器、读屏或后端上传验收。
