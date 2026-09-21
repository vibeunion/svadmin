import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DesignSystemShowcase from "./DesignSystemShowcase.svelte";

describe("DesignSystemShowcase", () => {
	it("renders the shared primitive state surface", () => {
		const view = render(DesignSystemShowcase);

		expect(view.getByRole("heading", { name: /Button states \/ 按钮状态/ })).toBeTruthy();
		expect(view.getByRole("button", { name: "Default" })).toBeTruthy();
		expect(view.getByLabelText("Compact input").getAttribute("data-size")).toBe("compact");
		expect(view.getByLabelText("Enabled").getAttribute("data-size")).toBe("compact");
		expect(view.getByText("Success")).toBeTruthy();
		expect(view.getByRole("checkbox", { name: "Enabled" }).parentElement?.tagName).toBe("LABEL");
		expect(view.getByRole("button", { name: "Menu" })).toBeTruthy();
		expect(view.getByRole("button", { name: "Open dialog" })).toBeTruthy();
		expect(view.getByRole("button", { name: "Hover hint" })).toBeTruthy();
		expect(view.getByRole("table")).toBeTruthy();
		expect(view.getByText("Blocked")).toBeTruthy();
	});

	it("keeps tabs click activation observable", async () => {
		const view = render(DesignSystemShowcase);
		const statesTab = view.getByRole("tab", { name: "States" });

		await fireEvent.click(statesTab);
		expect(statesTab.getAttribute("aria-selected")).toBe("true");
		expect(view.getByText("State content")).toBeTruthy();
	});
});
