# 富文本字段反馈续接

## 任务约定

- parent：`auto-form-compound-focus-20261021.md`；source：继续完成既有企业级表单规范。
- reason：真实 Editor 未接收字段 ID、反馈与 disabled，Lazy 包装器丢失这些属性；
  contenteditable 不能仅靠原生 label for 命名，反馈同步也不能重建编辑器。
- goal：字段名通过 aria-labelledby 关联实际 textbox；说明/错误、必填、
  只读/禁用同步到编辑区，反馈更新保持实例、内容及选区；disabled 隐藏值不提交。
- 必要范围：FieldRenderer、Editor、LazyRichTextEditor、单一定向集成测试及本文。
- 非目标：不替换 Tiptap、不重做主题/布局、工具栏功能、上传服务或 HTML 清理策略。
  复核指出的 drop/paste 迟到回执纳入必要修复，仅增加实例及可编辑代际检查，
  不把本地回执隔离视为服务端文件会话或完整上传错误反馈验收。
- Delegation Decision：medium / managed；主线程 writer，Bohr 唯一只读 verifier。
- 无 agmesh，本文记录续接。只增加向后兼容的可选编辑器属性，不新增组件或注册 API；
  不提交、推送、发布或部署。

## 验收

```gherkin
Given 通过 FieldRenderer 使用真实注册 Editor
When 渲染多个同名字段
Then 每个实际编辑区具有自己的 ID、字段名及说明/错误关联

Given 编辑器已获得焦点并有选区
When 说明或错误属性变化
Then 编辑器 DOM、内容和选区保持，属性被更新或移除，不调用 onchange

Given 编辑器 disabled 或 editable=false
When 宿主更新内容或恢复可编辑状态
Then 受控内容更新但不触发回调，禁用时没有可执行编辑菜单，隐藏字段不提交

Given 示例通过 Lazy 包装器加载编辑器
When 加载完成并更新反馈属性
Then 实际编辑区收到全部属性，页面内无重复 ID
```

## 状态

已完成本地实现和定向验证：

- `cd packages/ui && bun run test src/components/richtext-field-contract.test.svelte.ts`：
  最终 20/20 通过，使用真实 Tiptap Editor，不使用替身。
- 覆盖实际 contenteditable 的实例 ID、`aria-labelledby`、说明/错误、必填、多实例
  隔离、选区保持、反馈属性增删、禁用/恢复、隐藏值提交、工具栏隐藏、editable=false、
  onchange 交易回调、Lazy 包装器透传和单一 ID；drop/paste 上传在禁用、重新启用、
  只读、preset 重建、卸载和处理器替换后的迟到回执隔离，以及恢复后的新上传。
- `cd packages/editor && bun run build`：通过。
- `cd example && bun run test lazy-rich-text-editor.test.ts`：1/1 通过。
- `cd packages/ui && bun run test src/components/field-renderer-contract.test.svelte.ts src/components/auto-form-accessibility.test.svelte.ts`：
  54/54 通过。
- `git diff --check`：通过。
- Bohr 只读复核首次指出上传回执 P2：旧 handler 仅检查 editor 存在。已增加
  instance/generation/canEdit/isDestroyed 守卫，第二轮复核确认该 P2 已关闭，
  当前未发现新增明确 P0/P1/P2。
- 上传补测的初次失败源于 happy-dom 的 DragEvent 未接收 dataTransfer 初始化参数，
  改用真实事件加显式 dataTransfer 属性后最终矩阵通过；不是服务端上传验收。
- UI 与 Lazy 测试将模块解析到当前源码 Editor，注册 getter 也指向真实 Editor；
  没有以伪造 contenteditable 代替 Tiptap。未验证安装后包解析或部署产物。

Tiptap 测试输出存在既有 duplicate extension name 警告（`link`、`underline`），
未影响退出状态；本轮未重做扩展注册策略。未进行真实浏览器、读屏、上传服务、
全仓类型检查或消费者发布验收。工具栏 ImageUpload 子组件、上传失败提示和
重试交互仍需独立验收；本轮的迟到回执证明仅覆盖 Editor 的 drop/paste 入口。

后续工具栏回执隔离已单独推进，见
`toolbar-upload-lifecycle-20261021.md`；失败提示、重试和真实服务验收仍不包含在内。
