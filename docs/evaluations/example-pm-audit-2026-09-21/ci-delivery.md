# 迁移交付与远端 CI 收尾

日期：2026-09-21。

## 任务契约

- Parent：[迁移契约](../../architecture/tailwind-openui-migration.md)、[本地收尾](followup.md)。
- Source：用户授权完成后提交、推送、合入 main，允许强制推送。
- 首次交付：`560c2d33` 为测试断言及包元数据整理；`d5196a87` 为 Tailwind/OpenUI 迁移与 example 整改。两条提交已普通快进到远端 main，未强推、未删除历史、未改原工作区。
- 后续范围：仅修复该提交实际触发的 CI 失败，不恢复 Panda、不关闭检查、不发布 npm。
- 风险中等，managed：主 writer 集成；三个不重叠 writer 分别负责 reference-kit、stripe-first、指定测试文件，完成后切换只读复核。

## 实际发现及修复

| 远端检查 | 失败原因 | 修复 |
| --- | --- | --- |
| Design reference kit | 读取已删除的 Panda tokens/recipes | 映射到实际 app.css、Tailwind 主题映射和 recipes.ts；保留来源验证与负向回归 |
| Stripe-first design assets / specimens | 旧 recipe 路径及 CSS blob 已失效 | 当前来源单独记录；历史 Figma revision、blob、未同步状态保留，不宣称新视觉已获 Figma 验收 |
| CI / Native UI Styles lint | 新测试非空断言、三个页面的断言和未使用变量 | 使用已有 requireValue；静态导航改为非空 tuple；删除未使用派生变量 |
| Native UI Styles strict types | devframe 可选 peer cac 类型缺失、成员目录 undefined、测试 provider mock 不完整 | 声明开发依赖；明确支持移除 provider；修正 mock 契约，不降低类型检查 |
| Native primitive migration browser | 探针使用已退出组件的工具类和错误语义类名 | 对齐实际组件类，保留尺寸、断点、颜色和 RTL 断言 |
| Content recipe checks browser | 仍要求升级后与旧间距、换行、阴影完全相同 | 保留历史截图，另施加有限独立 reference，再逐字段和逐像素严格比对 |

内容 comparison 的 reference 只允许 header gap=24px、面包屑换行、clean-flat 指标的语义边框/背景色/阴影及已有四种趋势颜色。期望不读取 candidate 样式。历史组件与 candidate 共用当前主题 CSS，因此这证明当前主题下的迁移一致性，不证明历史主题外观毫无变化。

## 本地证据

- Reference-kit 单文件 67/67；sourceChecked=true；预览一致性检查通过。
- UI strict svelte-check：0 errors / 0 warnings。
- Example 检查：0 errors / 0 warnings。
- 四个修改测试逐文件执行：Mail 23/23、业务页面 19/19、builtin repairs 12/12、safety followup 9/9。
- 条件样式实际 Chromium：10/10 尺寸与主题场景。
- 内容组件实际 Chromium：48/48，保留历史、候选、修正 reference 和逐节点样式证据。
- 定向 lint 和差异检查通过；没有本地运行全仓套件。
- 首轮远端日志下载在忽略目录 `output/ci/d5196a87/`；本地 browser 证据在 `test-results/content-recipes/` 和 `test-results/ui-styles/conditional-styles.json`，不自动随 Git 提交。

首轮远端失败不能被本地通过改写为远端成功；追加提交后的 Actions 状态需要另行读回。Git 合入、CI 完成、npm 发布和生产部署是不同状态。
