export type DesignComponentState =
	| "default"
	| "hover"
	| "focus"
	| "disabled"
	| "loading"
	| "error"
	| "readonly"
	| "open"
	| "closed"
	| "boundary"
	| "empty"
	| "filtered-empty"
	| "forbidden"
	| "success"
	| "warning"
	| "danger"
	| "neutral"
	| "active"
	| "inactive"
	| "checked"
	| "unchecked"
	| "mixed"
	| "focus-restore"
	| "overflow"
	| "value";

export type DesignComponentContract = {
	id: string;
	name: string;
	codePath: string;
	codeExport: string;
	states: readonly DesignComponentState[];
	themes: readonly ["light", "dark"];
	sizes: readonly ["default", "compact"];
};

export const designSystemComponents = [
	{
		id: "ui.button",
		name: "Button",
		codePath: "packages/ui/src/components/ui/button/index.ts",
		codeExport: "Button",
		states: ["default", "hover", "focus", "disabled", "loading"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.input",
		name: "Input",
		codePath: "packages/ui/src/components/ui/input/index.ts",
		codeExport: "Input",
		states: ["empty", "value", "focus", "disabled", "error", "readonly"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.select",
		name: "Select",
		codePath: "packages/ui/src/components/ui/select/index.ts",
		codeExport: "Select",
		states: ["empty", "value", "focus", "disabled", "error"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.checkbox",
		name: "Checkbox",
		codePath: "packages/ui/src/components/ui/checkbox/index.ts",
		codeExport: "Checkbox",
		states: ["unchecked", "checked", "focus", "disabled", "mixed"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.tabs",
		name: "Tabs",
		codePath: "packages/ui/src/components/ui/tabs/index.ts",
		codeExport: "Tabs",
		states: ["active", "inactive", "focus", "disabled"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.badge",
		name: "Badge",
		codePath: "packages/ui/src/components/ui/badge/index.ts",
		codeExport: "Badge",
		states: ["success", "warning", "danger", "neutral"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.dropdown-menu",
		name: "DropdownMenu",
		codePath: "packages/ui/src/components/ui/dropdown-menu/index.ts",
		codeExport: "DropdownMenu",
		states: ["closed", "open", "focus", "overflow"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.dialog",
		name: "Dialog",
		codePath: "packages/ui/src/components/ui/dialog/index.ts",
		codeExport: "Dialog",
		states: ["closed", "open", "focus-restore", "overflow"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.tooltip",
		name: "Tooltip",
		codePath: "packages/ui/src/components/ui/tooltip/index.ts",
		codeExport: "Tooltip",
		states: ["closed", "open", "boundary"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.table",
		name: "Table",
		codePath: "packages/ui/src/components/ui/table/index.ts",
		codeExport: "Table",
		states: ["loading", "default", "empty", "filtered-empty", "error", "forbidden"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.status-badge",
		name: "StatusBadge",
		codePath: "packages/ui/src/components/content/StatusBadge.svelte",
		codeExport: "StatusBadge",
		states: ["success", "warning", "danger", "neutral"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.calendar",
		name: "Calendar",
		codePath: "packages/ui/src/components/Calendar.svelte",
		codeExport: "Calendar",
		states: ["default", "focus", "disabled", "active", "empty"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.carousel",
		name: "Carousel",
		codePath: "packages/ui/src/components/Carousel.svelte",
		codeExport: "Carousel",
		states: ["default", "focus", "disabled", "active"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.notification-center",
		name: "NotificationCenter",
		codePath: "packages/ui/src/components/NotificationCenter.svelte",
		codeExport: "NotificationCenter",
		states: ["closed", "open", "loading", "empty", "active"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.theme-settings",
		name: "ThemeSettingsDrawer",
		codePath: "packages/ui/src/components/ThemeSettingsDrawer.svelte",
		codeExport: "ThemeSettingsDrawer",
		states: ["closed", "open", "focus", "active"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.collapse",
		name: "Collapse",
		codePath: "packages/ui/src/components/Collapse.svelte",
		codeExport: "Collapse",
		states: ["open", "closed", "focus", "disabled"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.typography-ellipsis",
		name: "TypographyEllipsis",
		codePath: "packages/ui/src/components/TypographyEllipsis.svelte",
		codeExport: "TypographyEllipsis",
		states: ["closed", "open", "focus"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.comment-thread",
		name: "CommentThread",
		codePath: "packages/ui/src/components/CommentThread.svelte",
		codeExport: "CommentThread",
		states: ["default", "empty", "loading", "error", "disabled"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.space",
		name: "Space",
		codePath: "packages/ui/src/components/Space.svelte",
		codeExport: "Space",
		states: ["default"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.grid",
		name: "Grid",
		codePath: "packages/ui/src/components/Grid.svelte",
		codeExport: "Grid",
		states: ["default"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.row",
		name: "Row",
		codePath: "packages/ui/src/components/Row.svelte",
		codeExport: "Row",
		states: ["default"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.grid-cell",
		name: "GridCell",
		codePath: "packages/ui/src/components/GridCell.svelte",
		codeExport: "GridCell",
		states: ["default"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.col",
		name: "Col",
		codePath: "packages/ui/src/components/Col.svelte",
		codeExport: "Col",
		states: ["default"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.timeline",
		name: "Timeline",
		codePath: "packages/ui/src/components/Timeline.svelte",
		codeExport: "Timeline",
		states: ["default", "active", "neutral", "success", "warning", "danger"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.statistic",
		name: "Statistic",
		codePath: "packages/ui/src/components/Statistic.svelte",
		codeExport: "Statistic",
		states: ["default", "loading", "value"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.countdown",
		name: "Countdown",
		codePath: "packages/ui/src/components/Countdown.svelte",
		codeExport: "Countdown",
		states: ["default", "active", "disabled"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.resize-box",
		name: "ResizeBox",
		codePath: "packages/ui/src/components/ResizeBox.svelte",
		codeExport: "ResizeBox",
		states: ["default", "focus", "active", "disabled"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.tour",
		name: "Tour",
		codePath: "packages/ui/src/components/Tour.svelte",
		codeExport: "Tour",
		states: ["closed", "open", "active", "focus-restore"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.menu",
		name: "Menu",
		codePath: "packages/ui/src/components/Menu.svelte",
		codeExport: "Menu",
		states: ["default", "active", "open", "closed", "disabled", "focus"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.config-provider",
		name: "ConfigProvider",
		codePath: "packages/ui/src/components/ConfigProvider.svelte",
		codeExport: "ConfigProvider",
		states: ["default"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.progress",
		name: "Progress",
		codePath: "packages/ui/src/components/ui/progress/index.ts",
		codeExport: "Progress",
		states: ["default", "value", "loading", "success", "error"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.popover",
		name: "Popover",
		codePath: "packages/ui/src/components/ui/popover/index.ts",
		codeExport: "Popover",
		states: ["closed", "open", "focus", "boundary"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "ui.notification-host",
		name: "NotificationHost",
		codePath: "packages/ui/src/components/NotificationHost.svelte",
		codeExport: "NotificationHost",
		states: ["closed", "open", "success", "warning", "danger", "neutral"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
	{
		id: "template.page",
		name: "Page templates",
		codePath: "packages/ui/src/components/templates/TemplatePageShell.svelte",
		codeExport: "TemplatePageShell",
		states: ["default", "loading", "empty", "filtered-empty", "error", "forbidden"],
		themes: ["light", "dark"],
		sizes: ["default", "compact"],
	},
] as const satisfies readonly DesignComponentContract[];

export type DesignComponentId = (typeof designSystemComponents)[number]["id"];
