# AutoForm 上传集成证据

## 范围

AutoForm 转发类型化 upload/cancelUpload；FileUploadField 将成功结果的
`url` 和 `uploadId` 一并写入 JSON 引用，编辑已有附件支持回显和移除。
不向 contract-form 草稿写入 File；无上传回调时禁用托管入口。
独立 FileUpload/未托管 FieldRenderer 保留原生文件用途。

等待、上传、失败、取消和缺少有效引用均阻止保存；上传阻止静默离开。
reset、资源/Provider 和上传回调变更退休旧队列并隔离迟到通知。
ArrayField 按行及字段身份聚合子队列，不因其中一个完成或移除而解除其他队列保护。

## 主线程最终验证

以下 Vitest 用例均从 packages/ui 逐个单文件运行，exit 0：

| 文件 | 结果 | 用时 |
| --- | --- | --- |
| auto-form-file-upload.test.svelte.ts | 11/11 | 21.22s |
| file-upload-composition.test.svelte.ts | 6/6 | 10.68s |
| array-field-feedback.test.svelte.ts | 23/23 | 10.34s |
| file-upload-native.test.svelte.ts | 22/22 | 8.80s |
| form-engine-reset.test.svelte.ts | 11/11 | 9.90s |
| form-contract.test.svelte.ts | 101/101 | 26.29s |

从 scripts/fixtures/enterprise-ui 运行
`bunx playwright test --config playwright.autoform-upload.config.ts --reporter=line`：
Chromium/WebKit/Firefox × desktop/narrow，18/18，21.4s，exit 0。
真实 AdminApp + AutoForm + TypeBox 消费者使用受控上传器，覆盖上传阻止保存、
双标识提交、公开 reset 取消并隔离迟到成功、重新上传，以及失败重试。
所有场景 pageerror 为空。浏览器 Enter 只证明键盘路径；
直接 submit 保护由组件测试覆盖，不将二者混为同一种证据。

## 审查修复

独立 pi 只读审查指出单值替换后移除及下一次上传失败可能恢复更早的旧引用。
主线程修正基线结算：成功替换退休原引用，明确移除成功项输出 null；
下一次上传失败保留最近成功引用。单附件可清空的夹具契约明确允许 null，
未改生产资源 schema 或放宽核心校验。

自定义操作区新增 `formActions.isDisabled`，表示提交中或上传未解决；
`isLoading` 仅表示提交中或上传中。宿主按钮应绑定 isDisabled，
核心 submit 守卫仍阻止直接提交。两条新增回归与上述最终复跑均通过。
定向 ESLint 及 `git diff --check` 通过。
契约测试出现依赖 svelte2tsx 源映射缺失警告，但测试退出码为 0。

## 定向严格类型验证（2026-10-24 续接）

- parent: `enterprise-ui-closeout-20261024.md`
- source: 用户继续直到全部完成，pi 执行、主线程审查。
- reason: 行为测试不能替代新增上传组件内部的严格类型诊断。
- orchestration: managed，medium；pi 唯一代码 writer，主线程独立复核。

在 `form-contract.test.svelte.ts` 增加独立严格编译目标，并新增
`form-contract.upload-type-fixture.svelte`。该目标以
`strict`、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess` 等选项
虚拟编译 AutoForm、FieldRenderer、FileUploadField、ArrayField 和
FileUpload，并对列出的源文件与夹具/组件 roots 全部收集诊断；未列入
roots 的全依赖图诊断不计入该目标，避免把无关模块误当成生产错误。

夹具断言：

- `UploadHandler` 成功返回值仅含可选的 `url` / `uploadId` 引用，
  并允许无引用返回。该引用是结构类型而非 exact 键集合：仅返回
  `localPath` 且不兼容 `UploadHandler` 的形状被拒绝；结构类型不保证
  exact 键，实际过滤由 `uploadReference` 实现，因此不宣称新鲜返回对象
  的额外键一律被 excess property 拒绝。
- `cancelUpload` 接收受检的 `uploadId`、`idempotencyKey` 与生命周期
  `reason`；非法 reason 被编译期拒绝。
- FieldRenderer、FileUploadField、ArrayField 均接受同一 upload/cancel
  契约，数组夹具包含嵌套数组与文件子字段。
- `formActions` 解构出的 `isDisabled`、`isLoading` 为 `boolean`，
  `onSubmit` 为可调用提交入口。

未添加 `any` 或 `ts-ignore`。夹具故意传入错误 handler 时编译目标会报错，
确认不是空断言。定向结果：

| 命令 | 结果 |
| --- | --- |
| `bunx vitest run --config ./vitest.config.ts src/components/form-contract.test.svelte.ts`（packages/ui） | 102/102，26.33s，exit 0 |
| `bunx vitest run --config ./vitest.config.ts src/components/auto-form-file-upload.test.svelte.ts`（packages/ui） | 11/11，8.08s，exit 0 |
| `bunx eslint packages/ui/src/components/form-contract.test.svelte.ts packages/ui/src/components/form-contract.upload-type-fixture.svelte --max-warnings 0` | exit 0 |
| `git diff --check` | exit 0 |

本轮红→绿：

- 红：严格 roots 直接暴露 `FileUploadField.svelte.tsx:48` 与
  `ArrayField.svelte.tsx:43` 的 `Expected 0 type arguments but got 1`，
  来源是 Svelte `$props<...>()` 没有泛型参数。
- 修复：仅将这两个组件的最小改动为 `interface Props` +
  `let {...}: Props = $props()`；未移除目标、未降 strict、未过滤诊断。
- 红：修正 Props 后继续暴露 `FileUploadField.svelte.tsx:140/143` 的
  exactOptionalPropertyTypes 诊断，`id: string | undefined` 被传给必填
  `id: string`；改用 `definedOptions` 省略未定义属性。
- 红：随后暴露 `FileUploadField.svelte.tsx:142` 的 `required` 为
  `boolean | undefined`；同样用 `definedOptions` 省略。
- 绿：同一严格目标 102/102 通过；上传行为单文件 11/11 通过。

FieldRenderer 的文件上传分支不再单独传 `disabled`，而是以
`definedOptions({ disabled, upload, cancelUpload, onUploadStateChange })`
一并省略可能为 undefined 的 `disabled` 与上传回调；未拓展其他分支、
未拓宽类型。

本目标的直接收集范围是 FileUploadField、ArrayField、FileUpload、
types/reference 及对应夹具的诊断；AutoForm、FieldRenderer 仅用于解析
调用契约，两者全文件内部均不在本目标验收范围内。上述定向编译通过不等于
全仓类型门禁通过；本轮未运行全仓 typecheck，也未处理无关模块的既有诊断。

### 主线程最终复核

上述 pi 结果与主线程结果分开记录。最终修正 `disabled` 转发之后，主线程逐文件运行：

- `form-contract.test.svelte.ts`：**102/102**，exit 0，24.62s。
- `auto-form-file-upload.test.svelte.ts`：**11/11**，exit 0，9.01s。
- 修改的生产组件、编译测试及夹具定向 ESLint：exit 0。
- `git diff --check`：exit 0。

新增严格目标的 sources/roots 直接包含 FileUploadField、ArrayField、FileUpload、
共享上传类型和引用转换函数；未隐藏其诊断。FieldRenderer 全文件内部仍不在该新增
目标的诊断范围内，不以本结果声称全仓或所有组件内部编译通过。
既有 svelte2tsx 源映射缺失警告仍出现，未导致测试失败。

## 边界

此证据不证明真实对象存储、服务端取消/清理幂等、租户授权、读屏实机、
发布包或部署验收。未执行全量测试。
此前全仓 svelte-check 存在大量诊断，包括涉及 FieldRenderer 的
exactOptionalPropertyTypes 诊断；未完成全仓类型门禁，不宣称类型检查通过。
本轮保留现有工作区，不提交、推送、发布或部署。
