# Figma 离线设计桥接 v0.1

承接 PR #439 的参考资产。使用**本地开发插件 → `.svfig.json` → 离线分析**，
不依赖官方 MCP 调用额度，也不使用 REST 令牌、第三方代理、WebSocket 或动态代码执行。
导入是单独的、自有蓝图协议，不会把第三方导出自动变成可再分发的组件库。

## 完成范围与未验证边界

本目录实现可构建的插件、离线 CLI、受限蓝图导入、合成回归及插件 iframe 浏览器检查。
**尚未在真实 Figma 编辑器运行，尚未获得 Stripe/Park 的实际导出，不能宣称文件解析保真、
组件视觉验收或完整 UI Kit 完成。** `test/fixtures.cjs` 和 `demo.blueprint.json` 均为自有合成数据，
`--demo-*` 仅供工具冒烟测试，不是 svadmin 的新主题、生产 token 或 Stripe 设计资产。

导出插件使用官方标准 Plugin API，不使用 `use_figma` 扩展方法。开发插件需 Figma 桌面端
（macOS/Windows）；在 Design 文件内运行需可编辑权限。只读 Community 预览不能直接运行，
须在来源允许复制/使用的情况下操作自己的可编辑副本。额度替代不改变权限或素材许可。

## 一次安装

需要 Node.js 22+；工具本身**不需要 npm install、Bun、Panda 或 Python 依赖**。

1. 在 Figma 桌面端打开可编辑的 Design 文件，选择 **Plugins → Development → New plugin**，
   选择 Figma Design / Custom UI。保存 Figma 生成的目录，从其 `manifest.json` 复制数字 `id`。
   这个 ID 由 Figma 分配，不是文件 key、Community 文件编号或访问令牌。
2. 在仓库根目录（或交付包根目录）运行以下命令，把 `YOUR_FIGMA_PLUGIN_ID` 替换为实际 ID：

   ```sh
   node design/figma-offline/prepare-plugin.mjs --id YOUR_FIGMA_PLUGIN_ID --out ./svadmin-figma-plugin
   ```

   输出目录必须尚不存在。构建器不会覆盖原 Figma 模板或其他文件，输出 `manifest.json`、
   `code.js`、`ui.html`。`manifest.template.json` 不是可直接安装的成品，不能填入测试的假 ID。
3. 在 Figma 的 **Plugins → Development → Import plugin from manifest** 中选择输出的 manifest。
   若编辑器已将同一 ID 关联到旧模板，删除该本地开发插件的旧关联后再导入新 manifest，
   不删除设计文件、不发布 Community 插件。之后从 Development 启动插件。

生成 manifest 明确使用 `networkAccess.allowedDomains: ["none"]`。没有外部字体文件、
图片链接或 CDN；工具不导出/分发字体二进制。Figma 自身的云同步不因此变为离线运行。

## 导出参考数据

在有权限使用的参考文件副本中选择少量 Frame/Component，点击“生成导出文件”，再点击
“保存 .svfig.json”。默认包含选区子树、引用的样式与变量依赖闭包，以及最长边不超过 1600px
的 PNG；PNG 不放大。原始图片字节、全文件本地变量/样式均需单独勾选。

“全部本地变量和样式”可能包含选区之外的信息，默认关闭。返回的原始 REST 形状数据保存在
`nodes[].rest`，文档子树保存在 `nodes[].document`；不把重组数据冒充原始 Figma 响应。

变量包含集合、模式、valuesByMode、别名、scopes 和 codeSyntax；样式覆盖 paint/text/effect/grid。
远端引用解析失败、未导出组件定义、缺少图片或 PNG 都保留明确警告。缺失内容不能被解释成
“该文件没有这个能力”。导出期间不要编辑文档：Plugin API 的多次读取不是原子版本快照。

读取上限：20 个选区根、5000 个节点、64 层节点深度、2000 个变量、1000 个样式、40 个资源。
单资源最多 8 MiB，总资源 24 MiB；CLI 输入最多 40 MiB，插件还使用保守 JSON 字符预算。
过大导出失败，不静默截断。请缩小选区或取消图片/PNG。

## 离线分析

```sh
node design/figma-offline/analyze.mjs ./svadmin-export.svfig.json --out ./review-export-01
```

目标目录必须尚不存在，父目录需已存在。工具先校验全部数据，再创建新目录；拒绝覆盖、
目录符号链接、无效 base64 和缺少 PNG 签名的预览（签名检查不是完整图片有效性验证）。路径均由工具生成，图层名称不参与文件命名。
未知图片格式保存为 `.bin`，不生成可执行 HTML/SVG，不执行或主动打开任何导出内容。

```text
review-export-01/
├── manifest.json       # 来源、范围、源文件与资源 SHA-256、待审许可
├── nodes.json          # 图层子树和官方原始响应
├── variables.json     # 原始变量、模式、别名
├── styles.json        # 原始样式
├── analysis.json      # 组件/实例/文字/框架清单与诊断
├── warnings.json      # 未解析引用、循环、缺失值等
├── images/            # 可选图片字节；不按来源提供的路径落盘
└── previews/          # 可选 PNG 对照图
```

输出 JSON 和资源权限为仅当前用户读写。输入、导出目录及报告不应提交公开仓库。
`licenseReview=pending`、`redistributionApproved=false` 固定保留：程序检查和复选框不是授权证书。
这不是完整 JSON Schema / DTCG 转换器：特别是 FLOAT 变量不能自动推断为 px、rem 或无量纲数。
不会把参考值写回 `packages/ui/design/tokens.ts`，也不会修改现有 Surface Catalog。

`.fig` 二进制**不由本实现解析**。选择的是已讨论方案中优先级更高的官方插件导出路线；
没有自动安装 openfig-core/OpenPencil，也没有开启第三方远程写入桥接。需要第三方解析器时，应
独立锁定版本、审查依赖与许可，并用真实 `.fig` 加原始 PNG 做单独兼容性验收。

## 受控导入自有蓝图

先在自己可编辑的测试文件打开插件，选择 `demo.blueprint.json`，查看预览，勾选确认后再导入。
演示创建一个独立页面、一个 Value 模式变量集合、六个变量、一个组件、一个实例及文本/布局。
它不代表三类业务页面的设计稿，也不替换已有 svadmin 文件。

`svadmin/figma-blueprint-v1` 有意限制为：COLOR/FLOAT 变量及同类型别名；明确 CSS 变量映射与
picker scopes；FRAME/COMPONENT/TEXT/INSTANCE；水平/垂直 auto layout；固定的 Inter Regular。
导入后颜色、间距、圆角、字号使用变量绑定，实例保留组件关系。仅有一个模式，不伪造 Light/Dark。
暂不支持组件变体集、外部实例导入、字体切换、图片、矢量、交互原型或任意字段透传。

所有变量先创建，再连接别名；缺失/循环/错误类型在写入前失败。预览使用不可变快照，确认时
复验且检查原页面身份；单次操作期间拒绝重复提交。字体加载失败先退出，不静默替换字体。
只新增页面和变量，不改既有内容。相同 blueprint ID 重复导入被拒绝；失败仅回滚本次创建资源，
清理失败明确返回残留 ID，不把部分失败标为成功。真实布局需在画布检查，并再次导出 PNG 验证。

## 验证

```sh
node --test design/figma-offline/test/*.test.mjs
```

测试使用标准 Node test runner，无额外依赖，包含同一套打包后代码在无 Node 全局对象的 VM 执行。
Figma API 是明确标注的合成替身，因此 mock 通过不等于 Figma 的真实运行结果。

可选的真实 Chromium iframe 回归需预装 Python Playwright 及 Chromium，不是运行插件/CLI 的依赖：

```sh
python3 design/figma-offline/test/ui-browser.py --plugin ./svadmin-figma-plugin --evidence ./browser-evidence
```

`--chromium` 可指定浏览器路径。测试四组 UI 宽度/明暗、下载、只读导出拒绝写入、显式确认、取消、
过期响应、HTML 文本转义、键盘焦点、溢出与零外部网络请求。浏览器中的 Plugin API 宿主仍为
替身，不是实际 Figma 画布或生产应用 E2E，也不是完整无障碍认证。

## 官方接口依据（2026-09-19 核验）

- [Plugin quickstart](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)
- [开发插件安装](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-plugin-for-development)
- [插件权限与查看模式](https://help.figma.com/hc/en-us/articles/22012921621015-Guide-to-inspecting)
- [JSON_REST_V1 / PNG export](https://developers.figma.com/docs/plugins/api/ExportSettings/)
- [变量读写与绑定](https://developers.figma.com/docs/plugins/working-with-variables/)
- [允许的网络域](https://developers.figma.com/docs/plugins/manifest/)
- [setBoundVariable](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/)

本目录只补离线工具。已有 Figma 文件 `uFPeRnnQW2xe9vYEOYRF61` 的完成状态不自动改变；
参考素材许可待审状态不自动改变；不修改并行 PR、不合并、不发布、不部署。
