---
title: 参考目标
description: svadmin 企业级后台的统一参考目标、职责边界和验收入口
---

svadmin 有明确的参考目标，但它不是某个第三方模板，也不是把多个组件库
拼成一套新皮肤。参考目标分成五层，每一层只解决一种问题。

## 五层参考目标

| 层级 | 唯一入口 | 负责什么 | 不负责什么 |
| --- | --- | --- | --- |
| 视觉语言 | 根目录 `DESIGN.md`、`packages/ui/src/app.css`、`packages/ui/src/recipes.ts` | 颜色语义、层级、间距、圆角、阴影、焦点和动效边界 | 业务权限、查询和提交 |
| 产品工作流 | `docs/ENTERPRISE_PRODUCT_SYSTEM.md` | 主要任务、页面类型、字段取舍、操作归属和反馈生命周期 | 重新定义 token 或组件 CSS |
| 可执行目标包 | `design/reference-kit/` | 三类页面、18 个状态、8 个内容组件和现有 token 映射的机器校验 | 证明生产页面已经完成或 Figma 已验收 |
| 运行时组合 | `PagePattern`、资源 CRUD 页面、`component-registry`、`surfaceDesignContract` | 把页面模式、组件状态和作者可用 API 公开成代码契约 | 替宿主应用执行查询、鉴权或业务写入 |
| 验收证据 | `docs/ui-state-matrix.md`、浏览器测试和 `docs/evidence/` | 固定状态、视口、截图和恢复路径 | 用历史截图替代当前版本验收 |

发生冲突时，优先级为：权限与数据真实性、无障碍与状态契约、
`DESIGN.md` 的视觉规则、页面工作流规范、外部参考的结构观察。

## 页面目标

企业页面先按任务选择模式：

| 任务 | 首选模式 | 必须验证的状态 |
| --- | --- | --- |
| 查询并处理一批记录 | `ListPage` 或 `PagePattern list` | loading、empty、filtered-empty、error、forbidden、ready |
| 查看一个对象并执行下一步 | `ShowPage` 或 `PagePattern detail` | loading、ready、partial、error、forbidden |
| 修改配置并提交 | `ConfigurationPage` 或 `PagePattern form` | pristine、dirty、invalid、saving、success、error、readonly |
| 连续处理一个对象 | `WorkspaceLayout` 或 `PagePattern workspace` | 对象切换、主次区域、失败恢复、窄屏顺序 |
| 观察指标并钻取处理 | `DashboardPage` 或 `PagePattern dashboard` | 指标加载、异常、无数据、错误和钻取入口 |

`empty` 只表示当前资源确实没有记录；有筛选条件但没有匹配项必须使用
`filtered-empty`，并提供清除或调整筛选的恢复路径。非 `ready` 状态不得继续
展示看似最新的旧业务内容。

## 外部参考的使用边界

| 参考 | 只借鉴 | 不复制 |
| --- | --- | --- |
| Refine | 资源 CRUD、路由、数据和 mutation 归属 | 页面皮肤 |
| Ant Design | 表单校验、反馈、空态、加载和数据密集型行为 | 默认蓝色、圆角和组件外观 |
| shadcn/ui | 可读源码、组合方式、语义变体 | 第二套运行时或自由拼装页面壳 |
| Carbon / PatternFly | 企业通知、权限、空错误状态和运营布局 | 品牌 token |
| Fuse / Midone / Skote / Metronic | 导航、页面家族和场景覆盖 | 模板卡片、渐变、字体、Logo 和 CSS |

参考资料解决“应该覆盖什么问题”，不能覆盖 svadmin 自己的颜色、权限和
可访问性决定。

## 实施顺序

新增或改造页面时，按以下顺序留下证据：

1. 写清主要岗位、主要任务、判断依据、主操作和失败恢复。
2. 选择一个页面模式，确认数据、权限和提交仍由业务宿主拥有。
3. 复用共享页面壳、工具栏、状态组件和语义 token。
4. 逐项验证 ready、loading、empty、filtered-empty、error、forbidden
   以及该页面特有的部分结果或保存状态。
5. 在 `1440x900`、`1920x1080` 和需要时的 `390x844` 留下当前版本证据，
   再检查键盘焦点、长文本、溢出和恢复路径。

## 完成边界

`python3 design/reference-kit/validate.py` 通过，只能证明参考元数据和当前
源码映射一致；它不等于真实业务页面、Figma 文件、生产权限或线上部署已经
验收。浏览器测试、宿主集成和生产验收必须分别报告，不能合并成一个“UI 已完成”
结论。
