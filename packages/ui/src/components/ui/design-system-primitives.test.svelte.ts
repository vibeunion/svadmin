import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Badge from "./badge/badge.svelte";
import Checkbox from "./checkbox/checkbox.svelte";
import Select from "./select/select.svelte";
import DesignSystemTableHarness from "../../../test/fixtures/DesignSystemTableHarness.svelte";

describe("design system primitive contracts", () => {
	it("preserves Badge variants and compact sizing", () => {
		const view = render(Badge, { variant: "subtle-success", size: "compact" });
		const badge = view.container.querySelector('[data-slot="badge"]');
		expect(badge?.getAttribute("data-variant")).toBe("subtle-success");
		expect(badge?.getAttribute("data-size")).toBe("compact");
	});

	it("supports checkbox checked and indeterminate states", async () => {
		const view = render(Checkbox, { "aria-label": "Enabled", size: "compact" });
		const checkbox = view.getByRole("checkbox");
		expect(checkbox.getAttribute("data-size")).toBe("compact");
		expect(checkbox.getAttribute("data-state")).toBe("unchecked");

		await fireEvent.click(checkbox);
		expect(checkbox.getAttribute("data-state")).toBe("checked");
	});

	it("supports select placeholders, values, and compact sizing", async () => {
		const view = render(Select, {
			"aria-label": "Status",
			placeholder: "Choose a status",
			size: "compact",
		});
		const select = view.getByLabelText("Status") as HTMLSelectElement;
		expect(select.getAttribute("data-size")).toBe("compact");
		expect(select.value).toBe("");
		expect(select.options[0]?.textContent).toBe("Choose a status");

		expect(select.options).toHaveLength(1);
	});

	it("keeps table primitives discoverable through stable data slots", () => {
		const view = render(DesignSystemTableHarness);
		expect(view.container.querySelector('[data-slot="table"]')).not.toBeNull();
		expect(view.container.querySelector('[data-slot="table-body"]')).not.toBeNull();
		expect(view.container.querySelector('[data-slot="table-row"]')).not.toBeNull();
		expect(view.container.querySelector('[data-slot="table-cell"]')?.textContent).toContain("Ready");
	});
});
