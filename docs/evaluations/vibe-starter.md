# Vibe Starter 首版

## 范围与执行

- 来源：客户要求实施“svadmin 自带设计能力的 AI 开发底座”方案。
- 首版：开发者生成路径，客户管理试点，六类可修改页面、三套设计预设、
  AI Skill、机器可读目录与确定性浏览器验收。
- 技术栈：现有 Svelte 5 + Vite + TypeScript + Bun；保留 public svadmin API。
- 决策：Native / 中风险 / 单 writer，完成后一次独立只读 verifier。
- 不修改已有项目，不发布、不部署、不执行生产操作，不引入任意代码执行器。
- 当前未安装 agmesh；只读查询 coordination DB，未发现 running writer。
  按项目 Native Fast-Path 执行，不安装框架或新建虚假协调状态。

## 验收边界

| 能力 | 确定性验收 |
| --- | --- |
| CLI | 默认 dry-run、严格参数、既有目录与符号链接拒绝、打包文件存在 |
| 上下文 | 实际资源元数据生成 AI manifest；六类页面源码与目录匹配 |
| 设计 | 三种预设改变密度、宽度、表单列数、详情布局与主题 |
| 业务 | 客户创建/编辑/详情、跟进关联、审批结果与意见 |
| 状态 | 正常、空、加载、错误、拒绝访问、部分失败 |
| 视觉 | 桌面/移动端截图、页面级溢出检查、人工查看 |
| 安全 | 内存数据，无模型密钥，无生产访问，审批写入字段受 schema 限制 |

首版不等同于生产 CRM，不包含真实审批权限、不可变审计、持久化或托管模型。
现有 Surface 边界不变。后续样板扩展应由真实客户任务和人工视觉反馈驱动。

## 后续产品验收

固定客户需求集，对比原始生成方式与样板路径的首轮可用率、人工修改次数、
视觉偏好和工作流成功率。不能以测试通过代替这些产品指标，不能把未完成的
客户偏好评审称为“精品设计已验收”。

## 本次验证（2026-09-24）

- `bun test packages/create-svadmin/src`：84 pass，0 fail。
- 新增文件 ESLint、`git diff --check`：通过。
- `bun run --cwd packages/create-svadmin build`：通过。
- 生成项目 `bun run test:ui -- --workers=2`：38 pass；
  1440×900 和 390×844，覆盖六类页面、三种预设、创建/编辑、审批结果、
  跟进创建/编辑、只读与拒绝访问、状态矩阵、键盘跳转和移动导航。
- `blueprints/customer-workspace/previews/`：随包 12 张真实页面参考截图；
  二进制保真与路径越界拒绝均有单测。截图不是以后修改的验收凭据。
- `/tmp/svadmin-vibe-consumer-20260924`：使用本次本地 Core/App/UI/
  AI Elements/DevTools Contract tarball 隔离安装；
  `bun run check` 为 0 errors / 0 warnings，`bun run build` 通过。
  保持 `skipLibCheck: false`；starter 显式提供上游声明需要的 `csstype`。
- `/tmp/svadmin-vibe-cli-pack.W6pFG9`：解包 create tarball 后，
  由独立 Node 执行 `vibe init ... --preset operations --write` 成功，
  不依赖仓库源码或仓库 node_modules；含 Skill、预览、校验脚本。
- 工作区继承旧依赖时仍出现 24 个 Core/第三方声明错误；
  未改动现有 Core 或工作区依赖，隔离验证不代表修复了这一环境。
- 一次独立只读审查已完成；修正 getter API、纯 UI 资源能力声明、
  邮箱/日期格式校验与测试假阳性，补齐审批、跟进和只读权限验收。

## 分发状态

实现与本地验证：`PASS_SCOPED`。
正式 npm 消费验收：`PARTIAL`，状态 `blocked`。

精确阻塞：原始生成项目使用公开 registry 安装时，`@svadmin/app@^0.2.0`
请求返回 HTTP 404。本地 tarball 只证明实现与打包可用，不能代替 registry
发布与客户安装验收。未自动提交、推送或发布，也未扩展为发布框架改造。
解除阻塞需要单独授权的发布流程及原始依赖清单重新安装验收。
