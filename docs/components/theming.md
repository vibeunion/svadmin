# Theme System / 主题系统

> Dark mode + multi-color theme management

## Dark Mode / 暗色模式

```typescript
import { setTheme, toggleTheme, getTheme, getResolvedTheme } from '@svadmin/core';

setTheme('dark');     // 'light' | 'dark' | 'system'
toggleTheme();        // toggle light ↔ dark
getTheme();           // current setting ('light' | 'dark' | 'system')
getResolvedTheme();   // resolved to 'light' or 'dark'
```

AdminApp `defaultTheme` prop sets the initial mode. Persisted to `localStorage`.

AdminApp 的 `defaultTheme` 属性设定初始模式，自动持久化到 `localStorage`。

## Theme Strategy / 主题策略

By default, svadmin uses **standard** strategy: light-first with a `.dark` CSS class for dark mode. For apps that default to dark mode (e.g. dashboards, creative tools), use **dark-first** strategy:

默认使用 **standard** 策略：默认亮色，通过 `.dark` CSS 类切换暗色。对于默认暗色的应用（如仪表盘、创意工具），使用 **dark-first** 策略：

```typescript
import { configureTheme } from '@svadmin/core';
import type { ThemeConfig } from '@svadmin/core';

// Standard (default): adds .dark class for dark mode
configureTheme({ strategy: 'standard' });

// Dark-first: adds .light class for light mode (dark is default)
configureTheme({ strategy: 'dark-first' });
```

Or via `AdminApp` prop:

```svelte
<AdminApp
  {dataProvider}
  {resources}
  themeConfig={{ strategy: 'dark-first' }}
  defaultTheme="dark"
/>
```

| Strategy | Default Mode | CSS Class | Use Case / 使用场景 |
|----------|-------------|-----------|--------------------|
| `standard` | Light | `.dark` added for dark | General admin panels / 通用管理面板 |
| `dark-first` | Dark | `.light` added for light | Dark dashboards, creative tools / 暗色仪表盘、创意工具 |

## CSS Variable Overrides / CSS 变量覆盖

Override design tokens programmatically via `configureTheme`:

通过 `configureTheme` 编程式覆盖 design tokens：

```typescript
import { configureTheme, clearCssOverrides } from '@svadmin/core';

configureTheme({
  strategy: 'dark-first',
  cssOverrides: {
    '--primary': 'rgb(108, 124, 255)',
    '--background': 'rgb(5, 8, 17)',
    '--radius': '0.8rem',
  },
});

// Remove all overrides later
clearCssOverrides();

// Remove specific overrides
clearCssOverrides(['--primary']);
```

This injects CSS variables directly onto `<html>`, taking highest priority over `app.css` defaults.

这会将 CSS 变量直接注入 `<html>`，优先级高于 `app.css` 的默认值。

Color tokens must contain complete CSS color values. Convert legacy HSL channel
values into ordinary CSS variables rather than adding compiler directives:

颜色 token 应保存完整 CSS 颜色。旧 HSL 通道值使用原生 CSS 归一化，不需要 Tailwind 指令：

```css
:root, .svadmin-theme {
  --legacy-border-channels: 214.3 31.8% 91.4%;
  --border: hsl(var(--legacy-border-channels));
  --color-border: var(--border);
}
```

Using `border-color: var(--border)` with channel-only values is invalid CSS and falls back to `currentColor`, which can create unexpectedly dark borders.

将仅含通道的值直接用于 `border-color: var(--border)` 属于无效 CSS，会回退到 `currentColor`，从而产生异常深色边框。

### ThemeConfig Reference / 配置参考

| Property | Type | Default | Description / 描述 |
|----------|------|---------|-------------------|
| `strategy` | `'standard' \| 'dark-first'` | `'standard'` | Class toggle strategy / 类名切换策略 |
| `cssOverrides` | `Record<string, string>` | — | CSS variables to inject on `<html>` / 注入到 `<html>` 的 CSS 变量 |
| `disableColorScheme` | `boolean` | `false` | Skip setting `color-scheme` attribute / 跳过 `color-scheme` 属性 |
| `colorPreset` | `ColorPreset \| string` | `'default'` | Built-in or registered color preset; the built-in preset is used when no selection exists / 内置或注册的配色预设；未选择时使用内置配色 |
| `layoutPreset` | `'default' \| 'clean-flat'` | `'clean-flat'` | Layout composition. `'default'` is an explicit opt-out / 布局结构，`'default'` 是显式退回 |

## Color Themes / 多色主题

9 built-in color palettes, switchable via sidebar picker or API. The built-in preset is the default:

9 种内置配色，通过侧边栏选色器或 API 切换。默认是内置配色：

The example combines both presets:

示例同时使用以下两个预设：

```svelte
<AdminApp themeConfig={{ colorPreset: 'default', layoutPreset: 'clean-flat' }} />
```

```typescript
import { getColorTheme, setColorTheme, getColorThemes } from '@svadmin/core';
import type { ColorTheme } from '@svadmin/core';

setColorTheme('rose');    // set active color theme
getColorTheme();          // current color theme id

// Available themes
getColorThemes().forEach(ct => {
  console.log(ct.id, ct.label, ct.color);
});
```

| Theme | ID | Hex |
|-------|----|-----|
| Default | `default` | `#165DFF` |
| Neutral | `neutral` | `#71717a` |
| Indigo | `indigo` | `#4f46e5` |
| Blue | `blue` | `#3b82f6` |
| Green | `green` | `#22c55e` |
| Rose | `rose` | `#f43f5e` |
| Orange | `orange` | `#f97316` |
| Violet | `violet` | `#8b5cf6` |
| Stripe | `stripe` | `#635bff` |

### How It Works / 工作原理

- Color theme sets `data-theme` attribute on `<html>` element
- CSS variables in your theme CSS respond to `[data-theme="..."]` selectors
- Persisted to `localStorage` under `svadmin-color-theme` key

颜色主题在 `<html>` 上设置 `data-theme` 属性，CSS 变量根据 `[data-theme="..."]` 选择器响应。持久化到 `localStorage`（key: `svadmin-color-theme`）。

## Sidebar Controls / 侧边栏控制

The built-in sidebar provides:

内置侧边栏提供：

- 🎨 **Color picker** — Colored dots at sidebar footer to switch themes / 选色器圆点
- 🌓 **Dark mode toggle** — Sun/Moon icon button / 日月图标按钮
- 🌐 **Locale toggle** — Click to cycle through available locales / 点击切换语言

## Semantic Status Tokens / 语义状态变量

`@svadmin/ui` provides semantic CSS variables for status colors. All components use these tokens instead of hardcoded Tailwind colors, making them fully customizable:

`@svadmin/ui` 提供语义化 CSS 变量用于状态颜色。所有组件均使用这些 token，不再硬编码 Tailwind 颜色，完全可自定义：

| Token | Tailwind Class | Default (Light) | Default (Dark) | Usage / 用途 |
|-------|---------------|-----------------|----------------|-------------|
| `--success` | `bg-success` | `#00B42A` | `#27C346` | Positive status / 成功状态 |
| `--success-foreground` | `text-success-foreground` | `#FFFFFF` | `#FFFFFF` | Text on success / 成功文本 |
| `--warning` | `bg-warning` | `#FF7D00` | `#FF9A2E` | Caution / 警告状态 |
| `--warning-foreground` | `text-warning-foreground` | `#1D2129` | `#1D2129` | Text on warning. Stays dark, not white / 警告文本，保持深色 |
| `--info` | `bg-info` | `#3491FA` | `#57A9FB` | Informational / 信息状态 |
| `--info-foreground` | `text-info-foreground` | `#FFFFFF` | `#FFFFFF` | Text on info / 信息文本 |
| `--destructive` | `bg-destructive` | `#F53F3F` | `#F76965` | Danger / 危险状态 |

Override in your `app.css` or via `configureTheme({ cssOverrides })` API:

在你的 `app.css` 中覆盖或通过 `configureTheme({ cssOverrides })` API：

```css
:root {
  --success: #14C9C9;
  --warning: #F7BA1E;
}
```

```typescript
// Or programmatically / 或编程式覆盖
configureTheme({
  cssOverrides: {
    '--success': 'oklch(0.65 0.2 160)',
    '--warning': 'oklch(0.8 0.15 55)',
  },
});
```

## Size Tokens / 尺寸变量

Colors were never the whole theme. Controls, rows, spacing and type sizes are
tokens too, so a host can change density or scale by overriding variables
instead of re-writing component CSS.

颜色从来不是主题的全部。控件、行、间距和字号同样是 token，宿主可以通过覆盖变量
调整密度或尺寸，而不是重写组件 CSS。

| Token | Default | Meaning / 含义 |
|-------|---------|----------------|
| `--svadmin-control-h-mini` | `1.5rem` (24px) | Mini control. Compact density uses this / 迷你控件，紧凑密度使用 |
| `--svadmin-control-h-sm` | `1.75rem` (28px) | Small control / 小号控件 |
| `--svadmin-control-h` | `2rem` (32px) | Default control height / 默认控件高度 |
| `--svadmin-control-h-lg` | `2.25rem` (36px) | Large control / 大号控件 |
| `--svadmin-row-h` | `2.5rem` (40px) | Table and list row rhythm / 行节奏 |
| `--svadmin-table-head-h` | `2.5rem` (40px) | Table header height / 表头高度 |
| `--svadmin-table-state-min-h` | `8rem` | Table empty/loading state height / 表格状态高度 |
| `--svadmin-space-1…6` | `4px … 32px` | Spacing scale / 间距刻度 |
| `--svadmin-section-gap` | `--svadmin-space-5` | Gap between page sections / 区块间距 |
| `--svadmin-text-caption`…`--svadmin-text-title` | `12 / 13 / 14 / 16 / 20px` | Existing type scale / 既有字号 |
| `--svadmin-text-title-3` | `1.5rem` (24px) | Large title / 大标题 |
| `--svadmin-text-display-1…3` | `36 / 48 / 56px` | Display sizes / 运营标题 |
| `--svadmin-leading-tight` / `snug` / `body` | `1.25 / 1.35 / 1.4` | Line heights. Body copy uses `1.4` / 行高，正文 1.4 |
| `--svadmin-paragraph-gap` | `1.3125rem` (21px) | Gap inside `.svadmin-copy > p + p` only / 仅多段正文 |
| `--svadmin-measure` | `65ch` | Reading measure / 阅读宽度 |
| `--svadmin-shell-topbar-h` | `3.5rem` (56px) | Intentional SVAdmin topbar / 顶栏，有意保持 |
| `--svadmin-shell-sidebar-w` | `15rem` (240px) | Intentional SVAdmin rail / 展开导航，有意保持 |
| `--svadmin-shell-sidebar-w-collapsed` | `3.5rem` (56px) | Collapsed rail / 收起导航 |
| `--svadmin-shell-gutter` | `1.5rem` (24px) | Intentional page gutter / 页面留白，有意保持 |
| `--svadmin-shell-max` | `74rem` | Content max width / 内容最大宽度 |

Override them where the component tree is rooted. Never duplicate a token in a
second selector: two declarations create a competing density baseline, and
`packages/ui/src/size-token-css.test.ts` fails when that happens.

在组件树根部覆盖即可。不要在第二个选择器里重复声明同一个 token：两处声明会产生
互相竞争的密度基线，`packages/ui/src/size-token-css.test.ts` 会直接失败。

```css
/* Enterprise forms often need 44px controls: one override, no CSS fork. */
.fa-app-shell {
  --svadmin-control-h: 2.75rem;
  --svadmin-row-h: 2.75rem;
  --svadmin-section-gap: var(--svadmin-space-6);
}
```


### Runtime shell preferences

`ThemeSettingsDrawer` and the exported `uiPreferences` store add runtime shell controls without a second theme system:

- navigation mode: sidebar, top bar, mixed, split sidebar
- navigation theme: light, dark, follow page theme
- content width: fixed, fluid, wide
- compact density and color-safe mode
- page transitions and reduced motion
- compact, default and rounded corner presets

Preferences persist in `localStorage` under `svadmin-ui-preferences`; `resetUiPreferences()` restores the documented defaults. The settings are applied as data attributes and classes on the document root, so components keep using the same semantic tokens.

## Component defaults / 组件默认值

`ConfigProvider` supplies defaults for components that expose a compact size. An
explicit component `size` always wins.

```svelte
<ConfigProvider componentSize="sm" density="compact" direction="rtl" locale="zh-CN">
  <Button>Save</Button>
  <Input aria-label="Name" />
</ConfigProvider>
```

当前 `Button`、`Input`、`Select`、`Badge`、`Tag` 会消费 `componentSize` / `density`；
其他组件可以继续显式传入自身尺寸。上下文保存的是可响应读取器，运行时修改
`componentSize`、`density` 或 `locale` 会同步到这些消费者。包装层使用 `display: contents`，不会改变页面布局。

`DatePicker` 与 `Calendar` 消费 `locale`。解析顺序是组件 `locale` 属性、`ConfigProvider.locale`、i18n，最后才是 `en`。
文案扩展点在 `packages/ui/src/components/component-messages.ts`：优先使用同名 i18n key，缺失时回退到内置中文 / 英文。

## Visual contract / 视觉契约

Token source of truth is `packages/ui/src/app.css` `:root`. This page follows that file.
Default product skin is palette `default` plus `layoutPreset: 'clean-flat'`.

令牌以 `packages/ui/src/app.css` 的 `:root` 为准。默认产品皮肤是配色 `default` 加布局 `clean-flat`。

### Shell geometry / 外壳尺寸

These sizes are the intentional SVAdmin default. They are not retuned to Arco Pro Vue.

这些尺寸是 SVAdmin 有意保留的默认值，不向 Arco Pro Vue 的官方默认靠拢：

| | SVAdmin | Arco Pro Vue（仅作参照） |
| --- | --- | --- |
| Sidebar | `15rem` / 240px | `menuWidth: 220` |
| Top bar | `3.5rem` / 56px | navbar `paddingTop: 60px` |
| Gutter | `1.5rem` / 24px | — |
| Collapsed rail | `3.5rem` / 56px | — |
| Canvas | `#F7F8FA` | full-page `#FFF` is not the SVAdmin canvas |

`Layout` always renders `[data-svadmin-layout-footer]` for docked devtools. It does not copy Pro footer copy. `WorkspaceTabBar` stays opt-in, so the shell tab bar default matches Pro's `tabBar: false`.

`Layout` 始终渲染页脚槽，用来放停靠的开发工具，不复制 Pro 的页脚文案。工作区标签栏默认不挂载，对应 Pro 的 `tabBar: false`。

### Mask, ramps, type / 遮罩、色阶、排版

- `--svadmin-mask` and `--color-mask-bg` are `#1D2129` at 60% in both themes. Dialog, AlertDialog, Sheet, and Drawer (`.svadmin-drawer-overlay`) use it. Blur is off unless the overlay has `.svadmin-overlay-blur` or an ancestor has `data-svadmin-overlay-blur="on"`. The style guideline states this scrim. Arco's compiled dark stylesheet uses `rgba(23, 23, 26, 0.6)` instead; SVAdmin keeps one scrim so dark mode does not invert the mask.
- Hover and pressed states are `--primary-5` / `--primary-7` (and the success, warning, danger, info equivalents). The written default `#165DFF` keeps the official hex `#4080FF` / `#0E42D2`. Other brand colors get 5/7 from `interactionRamps()` in `packages/core/src/color-scale.ts`. Warning button text stays `#1D2129`.
- Disabled controls use text-4 (`--svadmin-text-4`) or the color-3 disabled fill. They do not use a blanket `opacity: 0.5`.
- Light text-3 / text-4 are `#86909C` / `#C9CDD4`. Dark text-3 / text-4 are white at 50% / 30%. Fill 1–4 and bg-4 / bg-5 are aliases beside the existing neutrals. `--foreground`, `--muted-foreground`, `--muted`, and `--primary` are not renamed.
- Body copy is `0.875rem` with `line-height: var(--svadmin-leading-body)` (`1.4`). Paragraph spacing `21px` applies only inside `.svadmin-copy > p + p`.
- `.layout-clean-flat[data-theme="default"]` uses a system stack: Helvetica Neue, system UI, PingFang SC, Microsoft YaHei. Nunito and Byte Number are not loaded. Other presets, including Stripe, keep their own stack.
- Shadow names `--shadow-special`, `--shadow-1`, `--shadow1-center`, `--shadow-2`, and `--shadow-3` alias the existing shadow tokens. The clean-flat shadow numbers are unchanged.
- `formatAdminTime`, `formatAdminNumber`, and `spaceCjkLatin` in `packages/ui/src/copy-format.ts` cover 24-hour time, thousands separators, and CJK–Latin spacing. They are not applied to every existing timestamp.

### Checking the contract / 怎么核对

```bash
bun scripts/audit-theme-contrast.ts --check
bunx playwright test --config playwright.visual-contract.config.ts
```

The Playwright spec asserts computed mask, type, and button tokens, and can refresh `docs/evidence/visual-contract/` with `UPDATE_VISUAL_CONTRACT=1`. Those images are review evidence, not a pixel-perfect Arco diff. `docs/components/parity.md` remains a capability list.
