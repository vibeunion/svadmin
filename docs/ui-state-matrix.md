# UI State Matrix

行为或布局变更必须同时提供状态矩阵、真实视口截图和当前 diff 检查证据。

## MediaThumbnail

| 状态 | 触发条件 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Empty | `src` 为空 | 语义化空态文字，不渲染图片外壳 | 不可放大 |
| Loading | `src` 有值且图片未完成加载 | 保持声明尺寸，显示加载指示 | 不可放大 |
| Error | 图片触发 `error` | 显示 ImageOff 和错误文案 | 不可放大 |
| Loaded | 图片触发 `load` | 显示实际媒体，不伪造占位图 | 可点击放大 |
| Preview | Loaded 后点击缩略图 | Dialog 展示完整媒体 | `Escape` 关闭并恢复焦点 |

## FilterToolbar

| 状态 | 触发条件 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Empty query | 查询为空 | 只显示搜索控件和主操作 | 清除按钮不渲染 |
| Query active | 查询非空 | 清除按钮与输入框同一行 | 点击清除恢复空查询 |
| Collapsed | 高级筛选关闭 | 高级容器卸载，不保留边距/背景 | `aria-expanded=false` |
| Expanded | 高级筛选打开 | 高级内容自适应，不固定高度 | `aria-controls` 指向面板 |
| Filtered empty | 条件无结果 | 由页面使用 `DataState empty` 表达 | 提供恢复路径 |

## Collapsible containers

所有折叠容器必须使用 `.svadmin-collapsible` 或 `[data-svadmin-collapsible]` 状态钩子。未展开时清除外层 margin、padding、border、background 和 shadow；不得添加全局 `details:not([open])` 规则。

## Browser evidence

`e2e/ui-state-contracts.spec.ts` 固定覆盖 `1440x900` 和 `1920x1080`，并验证媒体成功/失败/空态、预览关闭、筛选器展开/折叠、横向溢出和空态高度。测试始终在 `test-results/**/screenshots/` 生成按视口命名的截图产物。

## Repository audit

`scripts/ui-state-evidence-check.ts` 扫描 `example/src/pages`、`packages/ui/src/components` 和 `packages/lite/src/components`：不得直接拼装无所有者的 `<img>` 预览、不得出现未限定作用域的 `<details>`，也不得使用 160px 以上的固定最小高度制造空入口或空数据占位。看板、权限矩阵、对话框和可滚动编辑器等固定格式控件通过显式白名单保留尺寸约束；新增例外必须先说明交互所有权。

完整 UI 使用 `MediaThumbnail`，SSR-first 的 `@svadmin/lite` 使用无跨包依赖的 `LiteMediaThumbnail`。详情字段与编辑字段不再分别维护图片加载和失败样式。

保留直接 `<img>` 的范围仅限明确的专用媒体所有者：头像、租户标识、标题图标和个人资料封面组件。它们具有不同的裁剪、上传或身份语义，不属于通用附件/证据预览，不能为了形式统一而错误抽象。
