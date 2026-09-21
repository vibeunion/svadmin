# 迁移交付与远端 CI 收尾

日期：2026-09-21。

## 任务契约

- Parent：[迁移契约](../../architecture/tailwind-openui-migration.md)、[本地收尾](followup.md)。
- Source：用户授权完成后提交、推送、合入 main，允许强制推送。
- 首次交付：`560c2d33` 为测试断言及包元数据整理；`d5196a87` 为 Tailwind/OpenUI 迁移与 example 整改。两条提交已普通快进到远端 main，未强推、未删除历史、未改原工作区。
- 后续范围：仅修复该提交实际触发的 CI 失败，不恢复 Panda、不关闭检查、不发布 npm。
- 风险中等，managed：主 writer 集成；三个不重叠 writer 分别负责 reference-kit、Admin UI 设计资产与样例、指定测试文件，完成后切换只读复核。

## 实际发现及修复

以下按职责归类远端检查，不逐字引用历史 Actions 名称；原始日志与提交记录不改写。

| 远端检查类别 | 失败原因 | 修复 |
| --- | --- | --- |
| Design reference kit | 读取已删除的 Panda tokens/recipes | 映射到实际 app.css、Tailwind 主题映射和 recipes.ts；保留来源验证与负向回归 |
| Admin UI 设计资产与样例 | 旧 recipe 路径及 CSS blob 已失效 | 当前来源单独记录；历史 Figma revision、blob、未同步状态保留，不宣称新视觉已获 Figma 验收 |
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

## 中性命名与第二轮验收

- Source：用户要求系统及文件名不包含已退出的外部品牌命名。
- 当前设计资产目录统一为 `design/admin-ui`；两个设计工作流及重构契约测试同步改名，更新路径过滤、命令和产物引用。
- 文档以 SVAdmin 自身设计原则为准，保留 OpenUI 方向。仓库与生成器的 DESIGN.md 同步；移除不再采用的活动参考，不伪造第三方链接或历史引文。
- 当前版本 3,041 个文件的路径和文本扫描零残留；历史 Git 对象及原始 CI 日志不改写。
- 命名关联契约 16/16、样式来源契约 5/5、app.css 单文件测试 10/10 通过；定向 lint 和差异检查通过。
- Reference-kit 单文件 72/72，离线插件 64/64；设计资产生成器 17/17、Preview model 13/13，Preview 类型检查无错误或警告。
- `def4da77` 的远端验收仍有三个失败检查类别：主 CI 的旧页面源码断言、设计预览的废弃 recipe 导入、Native UI 的浏览器对比和旧组件断言。本轮逐项修复；这些旧结果不作为新提交已通过的证据。
- 保留并行提交 `b9e7774c` 的 CRM 进度修复；不覆盖其他作者改动，不重写 main 历史。
- 修复不支持 `color-mix` 时消失的键盘焦点轮廓：先声明 `var(--ring)` 回退，再使用增强色值；app.css 单文件测试增加至 11/11。
- 历史基线到升级后目标的累计差异以 11 个固定浅色 token 记录独立 reference，其中 7 项在本次升级提交改变、4 项此前已达目标；禁止从候选样式取期望。保留原始 baseline、reference、published 三组截图，仍严格比对计算样式与 PNG；浏览器 6/6、焦点与对比度回退 12/12。证明范围限于当前夹具，并非全应用历史外观不变。
- 真实 provider 行为的 reference-pages 回归 7/7，返回导航回归 19/19；不再期待已移除的模拟 MFA 流程。
- 设计预览 228/228 场景、6/6 交互、2/2 键盘场景、2/2 主题颜色检查通过。
- UI 和 example 构建成功；本地 5191 预览已更新，1440px / 390px 首页无横向溢出、无页面运行错误。

## 后续门禁修复

- `7a07d380` 的全仓测试、Native UI、内容组件和设计预览均通过；主 CI 在 example 布局产物检查处失败，因此不标为整体完成。
- 布局产物契约对齐当前侧栏 hook，保留 252/70px、移动端归零、桌面断点和 RTL 约束。启动图必须包含入口立即加载的 App，不再漏算动态启动模块。
- 保持原体积预算，默认 CRUD/Settings 和 example 业务表单按需加载；启动 1,229,578 bytes、gzip 363,104 bytes，Editor 保持动态边界。参数与 snippet 转发、加载失败和重试有直接回归。
- 四个业务页面补齐折叠 hook；Case 图片使用 MediaThumbnail，提供加载/失败状态，文本框使用 rows。页面状态门禁通过。
- CRM 阶段标签补充原始阶段回退；全仓类型检查无错误。测试的动态导入等待使用 `vi.dynamicImportSettled()`，不放宽按钮超时或安全返回参数断言。
- ExcelJS 的 UUID 定向升级为 11.1.1，Mermaid 保持 14.0.2。Bun 1.4.2 冻结安装验证通过，锁文件格式3；ExcelJS 条件格式往返回归通过，官方 npm 审计零漏洞。
- 商品新建页关联字段不再把空字符串作为选中 ID 查询：单选默认 null，多选默认空数组，合法 0/string ID 保留。选择器单文件 69/69；真实浏览器分类、供应商各3项，选择、清空、重新展开无错误。
- 本地 npm 打包、真实安装、导入、pnpm 消费与文档构建通过。最终提交的远端 CI 状态仍须另行读取，不用前序成功替代。
