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

Surface 自行打包预生成的 recipe 助手与 styles.css，避免让旧 UI peer 安装必须提供新增的 JS 导出入口。构建本仓库时先构建 UI 样式，再构建 Surface；消费发布包时不需要安装 Panda 或 Tailwind。配合尚未包含新 recipe CSS 的 UI 版本时必须加载 Surface 的 styles.css。

AI 只能选择公开枚举，不能指定 class/style、任意颜色、recipe 定义或可执行代码。字段权限、只读查询、版本匹配和宿主确认要求不因样式变体而改变。

本次是两类 Surface 组件的 recipes 试点；其他 UI 继续使用保留的原生兼容样式。OpenUI Lang 的解析、流式渲染适配、全量 UI recipe 重写以及 DTCG 文件转换器不在本次已实现范围。不能把 CSS 编译器移除等同于以上功能已经完成。
