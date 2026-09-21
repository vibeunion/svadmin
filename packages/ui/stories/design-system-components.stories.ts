import DesignSystemComponentStory from "./DesignSystemComponentStory.svelte";

const componentStory = (kind: string, theme: "light" | "dark") => ({
	render: () => ({
		Component: DesignSystemComponentStory,
		props: { kind, theme },
	}),
});

export default {
	title: "Design System / 设计体系 / Components / 组件",
	parameters: { layout: "fullscreen" },
};

export const ButtonLight = componentStory("button", "light");
export const ButtonDark = componentStory("button", "dark");
export const InputLight = componentStory("input", "light");
export const InputDark = componentStory("input", "dark");
export const SelectLight = componentStory("select", "light");
export const SelectDark = componentStory("select", "dark");
export const CheckboxLight = componentStory("checkbox", "light");
export const CheckboxDark = componentStory("checkbox", "dark");
export const TabsLight = componentStory("tabs", "light");
export const TabsDark = componentStory("tabs", "dark");
export const BadgeLight = componentStory("badge", "light");
export const BadgeDark = componentStory("badge", "dark");
export const MenuLight = componentStory("menu", "light");
export const MenuDark = componentStory("menu", "dark");
export const DialogLight = componentStory("dialog", "light");
export const DialogDark = componentStory("dialog", "dark");
export const TooltipLight = componentStory("tooltip", "light");
export const TooltipDark = componentStory("tooltip", "dark");
export const TableLight = componentStory("table", "light");
export const TableDark = componentStory("table", "dark");
export const StatusBadgeLight = componentStory("status-badge", "light");
export const StatusBadgeDark = componentStory("status-badge", "dark");
