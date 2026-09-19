# No-Tailwind component migration / 无 Tailwind 组件迁移

## Scope and ownership

用户要求保留 Svelte 5 / Bits UI 交互及公开组件 API，退出 shadcn-svelte
默认生成链路，采用 Panda tokens / recipes，并以 Stripe-first 为视觉基线。
本批从 #427 创建独立分支 feat/no-tailwind-native-primitives，避免并行修改互相覆盖。
不合并、不发布、不部署，不修改数据权限或 Surface v1。
本次由单一实现者编辑并运行确定性测试；独立审查仍未完成，不作为合并批准。

## Implemented in this batch

- Button 的 6 个 variant × 8 个 size、Badge 的 11 个 variant，以及 Input
  的五个 slot / Textarea 接入预生成 Panda recipes。保留公开 helper、null
  语义、语义类名、文件输入绑定、禁用链接保护和禁用原因提示。
- 发布 CSS 时让已迁移实例退出旧 primitive 默认规则；未迁移消费者仍得到
  原生 fallback。原有 compatibility 文件和 SHA 固定基线不改动。Panda
  primitive 样式保留 components 层，Surface 增强仍不分层。
- UI 的 app.css 与 app.theme.css 为相同原生 CSS；AI 的 ai.theme.css
  只导入 ai.css。两个旧路径保留，但不再提供任何 Tailwind 编译器元数据。
  postbuild 从原生 aliases.css 读取映射，保留嵌套主题重绑定及幂等输出。
- 移除未引用且包含 Windows 绝对路径 / Tailwind 注入逻辑的 fix-css.js。
  包验收、文档和脚手架说明同步改为原生 CSS，不引导执行 shadcn-svelte CLI。
- 严格扫描 manifests、锁文件、CSS、Svelte script/style 和 TS/JS import。
  使用仓库已有 TypeScript 解析器，避免把负例测试字符串误判为真实导入。
  同时禁止 npm alias、Tailwind 辅助包以及 generator 配置重新引入依赖。

## Current acceptance status: PARTIAL

`streamdown-svelte` 3.0.6 仍通过依赖树引入 `tailwind-merge` 3.6.0。
严格检查会失败，这是未完成项，不是允许名单。没有删掉 Markdown、流式显示、
代码高亮、公式或 Mermaid 来规避它，也没有设置空模块 alias。

旧组件中的 svadmin-u-* / --tw-* 原生兼容规则仍存在。本批不是全组件 recipe
重写；剩余组件需按交互和视觉回归逐批迁移后才能删除兼容层。设计升级、Park
色板替换、后端变化不包含在此批中。

## Verification

本地运行 41 项测试通过（Node 22.16.0，PostCSS，已安装 TypeScript 解析器）：

```sh
node --experimental-strip-types --test \
  packages/ui/scripts/primitive-recipes.test.mjs \
  packages/ui/scripts/primitive-css-layers.test.mjs \
  packages/ui/scripts/native-css-entries.test.mjs \
  packages/ui/scripts/retire-primitive-fallbacks.test.mjs \
  scripts/no-tailwind-contract.test.mjs
```

覆盖：变体契约、完整原生 CSS 打包及 postbuild、重复构建、嵌套主题映射、
错误导入、层级、fallback 退役范围、锁文件传递依赖、别名与负例。

CI run 35415632600（head 8ee6af6，检出合并源 5f25ec6）已完成冻结安装、
14 项检查器测试、AI Elements 构建、Panda 生成和 UI Svelte 打包，但 UI
旧 postbuild 读取 @theme 失败，后续测试被跳过。本提交修复该遗漏，不能把
旧步骤 conclusion: success 当作真实构建成功；应读取 outcome 和原始日志。

本地还以该 CI 的真实 UI dist 检查四类组件的生成规则、null 语义及缺失规则
负例，通过六项 runtime 测试。实际 Svelte 行为、类型、完整发布及新截图仍须
以修复后 CI 的确切 source SHA 和结果验收，不能引用旧截图证明本次修改。

严格依赖检查、全仓库 CI、完整应用回归和独立审查全部通过之前，PR 保持 Draft。
