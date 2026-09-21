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
		id: "ui.menu",
		name: "Menu",
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
] as const satisfies readonly DesignComponentContract[];

export type DesignComponentId = (typeof designSystemComponents)[number]["id"];
