import DesignSystemShowcase from "../src/components/ui/DesignSystemShowcase.svelte";

export default {
	title: "Design System / 设计体系 / Primitives / 基础组件",
	parameters: {
		layout: "fullscreen",
	},
};

export const AllStates = {
	render: () => ({
		Component: DesignSystemShowcase,
	}),
};
