# svadmin Stripe-first · Reference Kit v0.1

这是**设计参考资产入口**，不是新的组件库、运行时 Surface Catalog 或 DTCG token 包。
本批只补齐参考来源、三类页面的状态契约、现有组件/主题映射及机械校验；不修改生产组件、尺寸、颜色、依赖、权限或发布行为。

## 当前实物与边界

| 产物 | 状态与用途 |
| --- | --- |
| `manifest.json` | Stripe Connect Toolkit、Park UI Foundations 的来源及待审许可状态 |
| `contract.json` | 3 类页面、18 个状态、8 个内容组件、15 项现有 token 映射 |
| `validate.py` / `test_validate.py` | 无第三方依赖的元数据、源码映射及负例回归 |
| `render_preview.py` | 从已校验元数据确定性生成离线 `preview.html`，不执行组件代码 |
| `.github/workflows/design-reference-kit.yml` | 只读 CI：源码映射、回归测试、预览生成；不是应用 E2E |
| [Figma 文件](https://www.figma.com/design/uFPeRnnQW2xe9vYEOYRF61) | **已创建但为空**。首次读取返回 Starter MCP 额度耗尽；没有变量、组件或页面图层验收 |

`preview.html` 是供人审阅的**契约目录**，不是三个页面的完整视觉设计稿，也不是 Figma 导出或真实应用截图。
它的存在不能把上述 Figma 状态改成完成。生成文件不提交仓库，CI 会重新生成后验证确定性。

### 已锁定范围

资源列表：加载、正常、首次无数据、筛选无结果、失败、无权限。
对象详情：加载、正常、部分数据、失败、无权限。
设置表单：未修改、待保存、校验失败、保存中、保存成功、保存失败、只读。

每个状态声明反馈归属、移除条件、恢复路径、数据可见范围与验收要求。**这些是设计要求，不是既有组件已满足全部要求的证明。**
组件映射只关联现有内容组件索引，不声称这些组件已经在 Surface 单独注册，也不创建第二套 AI 协议。
表格、详情记录和字段通过现有宿主组合区接入；不增加任意 CSS、函数、业务写操作或授权绕过路径。

## 来源与素材许可

只采用两套主要参考：

- [Stripe 官方 Appearance 文档](https://docs.stripe.com/connect/embedded-appearance-options)链接的 [Connect Toolkit](https://www.figma.com/community/file/1438614134095442934)：研究层级、状态和组合。它不是整个 Stripe Dashboard 内部设计系统；文档的 Example Value 不是应复制的默认 token。
- [Park UI Figma 文档](https://park-ui.com/docs/figma)中的 [Foundations](https://www.figma.com/community/file/1268615283036362769)：研究基础组件、变量和明暗模式的组织。

两份外部文件的内部图层均未完成检查，文件级许可均待审，`redistributionApproved` 均为 `false`。
本目录没有复制、改造或再分发第三方图层、字体、图片或组件素材。代码许可证不自动覆盖 Figma 文件。
“参考入口核验”不等于许可批准；v0.1 校验器不接受直接将审批状态改为通过。未来需同时补充真实证据与相应校验规则。

## 保留现有实现，不暗改视觉

初始源码基线：`c91936335e1a431f2ac37dec31da138afbbbc21f`。
映射入口：`packages/ui/design/tokens.ts` 和 `packages/ui/src/components/content/index.ts`。

代码基础间距仍为 `0.25rem / 0.75rem / 1rem / 1.25rem`；根字号为 16px 时是 4 / 12 / 16 / 20px。
`DESIGN.md` 的 `sm=8px`、`lg=24px` 与代码不同，差异在契约内保留，不通过修改现有数值消除。

浏览器主题仍使用原公开 CSS 自定义属性。审阅页的少量明暗配色来自该基线
`packages/ui/src/components.css` 的 `:root` / `.dark` 快照，仅服务离线阅读，
不证明当前发布 CSS 或宿主覆盖的计算样式；未来主题资产仍需统一治理。
本目录不是 DTCG 转换器，不宣称已完成 token 单一来源迁移或完整 UI Kit。

## 检查与生成

在完整仓库根目录，使用 Python 3.10 或更高版本；不需要安装 npm、Panda 或 Python 依赖：

```sh
python3 design/reference-kit/validate.py
python3 -m unittest discover -s design/reference-kit -p 'test_*.py' -v
python3 design/reference-kit/render_preview.py
python3 design/reference-kit/render_preview.py --check
```

默认检查真实源码。独立资产包中没有完整仓库时，可以明确使用以下模式；结果会标记 `sourceChecked: false`，不能当作源码映射通过：

```sh
python3 design/reference-kit/validate.py --metadata-only
```

映射校验也支持 `--source-root /path/to/source`。回归测试的真实源码组可通过
`SVADMIN_REFERENCE_SOURCE_ROOT=/path/to/source` 指向两份完整源码文件的快照；不得用残缺片段替代。

校验器拒绝重复 JSON 键、未知字段/组件/状态、缺失状态、错误反馈区域、无权限数据暴露要求、
持久成功通知、未授权资产分发、虚假的 Figma 完成标记及非法路径/CSS 值。
源码校验解析两个指定 `export const` 声明对象及内容组件默认导出，检查映射与字面量值。
注释不能冒充声明；表达式、展开、转义字符串等未支持语法失败退出，需要显式扩展解析器。
这不是完整 TypeScript AST、包公开 API 验证、组件行为测试或服务端授权检查。

预览是无脚本、无表单、无外部资源请求的原生 HTML/CSS，所有文案经过 HTML 转义。
它覆盖三类模式的 18 个状态说明，跟随系统明暗主题；可以直接打开生成文件审阅。
`--check` 在文件缺失或过期时退出非零，不自动重写产物掩盖差异。

## 尚未完成与接续条件

Figma 内容写入需恢复当前账号的 MCP 可用额度后，在**上述已有文件**继续，不重复创建空文件。
随后依次核验文件结构、建立自有变量与基础组件、组成三类页面及状态稿，再返回真实 node IDs 和截图。
未经外部文件级许可审查，仍不得导入第三方素材。

完整设计稿、Figma 变量/组件/Code Connect、DTCG 转换、生产组件视觉改版、
三类工作流的真实浏览器回归、跨浏览器/键盘/读屏验收均未由本批完成。
`acceptanceTargets` 的明暗与三种视口只是后续验收目标，不是测试通过记录。
本批不修改 PR #436，不合并主干，不手动发布或部署。
