# svadmin Design System / 核心设计体系

本目录是设计工具之外的可审计设计资产入口。代码、Token、组件契约和测试仍是事实来源；Penpot 是可同步的设计视图。

## Target platform / 目标平台

- Primary: Penpot online workspace / Penpot 在线工作区
- Code source of truth: `packages/ui` / 代码事实来源：`packages/ui`

## Penpot file structure / Penpot 文件结构

建议在同一个 Penpot 项目中维护以下页面：

| Page / 页面 | Purpose / 用途 |
| --- | --- |
| `00 Foundations / 基础` | 颜色、字体、间距、圆角、阴影、主题变量 |
| `10 Components / 组件` | 基础组件、尺寸、主题和交互状态 |
| `20 Page patterns / 页面模式` | 导航、表单、表格、筛选器、弹窗、工作台 |
| `30 Acceptance / 验收` | 代码截图、设计截图、差异记录和验收矩阵 |
| `40 Code inventory / 代码目录` | 公开导出、代码路径和组件映射登记 |

## Naming convention / 命名规则

- 页面、Frame、Component、Layer、说明均使用 `English / 中文`。
- 组件 ID 使用稳定的 `ui.*` ID，不使用品牌词或临时页面名称。
- 组件状态与代码契约保持同名，例如 `Button / 按钮 / State=Focus / 状态=焦点`。
- 主题统一使用 `Theme=Light / 主题=浅色` 与 `Theme=Dark / 主题=暗色`。
- 组件内部可见文案使用单语示例（例如 `Save`、`Email`、`Delete item?`）；双语仅用于页面结构、图层名称、契约说明和验收标注。

## Migration status / 迁移状态

- [x] 从代码导出基础组件契约
- [x] 建立 Penpot 页面、组件和验收清单
- [x] 连接 Penpot workspace / 连接 Penpot 工作区
- [x] 创建五个页面并写入组件资产
- [x] 登记 `packages/ui` 的 251 个公开导出
- [x] 写入组件的双主题、尺寸和交互状态摘要
- [ ] 完成 Penpot 与浏览器逐组件截图对照
- [ ] 完成包级验收

迁移未完成前，不应把 Penpot 文件标记为最终验收版本。
