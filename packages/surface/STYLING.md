# Surface semantic styles

默认 `svadmin/v1` 的校验规则和未指定变体时的组件样式保持兼容。新语义变体必须显式选择 `styledSurfaceCatalog`，不能只把 tone/density 添加到旧版 spec。

```ts
import '@svadmin/ui/app.css';
import '@svadmin/surface/styles.css';
import { styledSurfaceCatalog, STYLED_SURFACE_CATALOG_VERSION } from '@svadmin/surface/svelte';
```

将 spec.catalogVersion 设置为 STYLED_SURFACE_CATALOG_VERSION，并把同一 styledSurfaceCatalog 传给提示生成器、校验器和 SurfaceRenderer 的 catalog 属性。这样三个环节使用同一组件契约。`metric` 支持 tone（neutral/success/warning/danger/info）及 density（comfortable/compact），`resource-table` 支持 density。

```json
{
  "type": "metric",
  "props": {
    "label": "待处理订单",
    "format": "number",
    "tone": "warning",
    "density": "compact"
  }
}
```

以上只是 widget 片段；完整 spec 仍需要 schemaVersion、catalogVersion、数据源、绑定及布局等必要字段。

Surface 使用本地有限 recipe helper 和静态 styles.css；design-contract 统一从 @svadmin/ui/design-contract 导入，要求 UI >=0.73.0 <0.74.0。不复制 UI 生成物，也不依赖样式编译器。渲染组件自动导入语义样式；原有 styles.css 子路径仍可显式导入。UI 基础样式仍由宿主通过 @svadmin/ui/app.css 加载。构建仅执行 svelte-package；styles:check 检查全部有限变体及静态 CSS 边界。

editor.css 与本地 styles/editor.ts 一起维护，保留 density、button variant、禁用/焦点状态和语义变量覆盖；editor.css 子路径不变。宿主升级时应同时升级 UI 与 Surface，并重新执行消费侧构建。

AI 只能选择公开枚举，不能指定 class/style、任意颜色、recipe 定义或可执行代码。字段权限、只读查询、版本匹配和宿主确认要求不因样式变体而改变。

此次仅替换样式基础设施。OpenUI 入口、catalog/schema 校验、workflow 授权与执行、提案预览及宿主确认逻辑保持不变；去除样式编译器不代表增加新的协议能力。
