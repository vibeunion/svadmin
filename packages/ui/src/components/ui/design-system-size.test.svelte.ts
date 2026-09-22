import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Badge from "./badge/badge.svelte";
import Checkbox from "./checkbox/checkbox.svelte";
import Input from "./input/input.svelte";
import Select from "./select/select.svelte";

describe("design system size contract", () => {
	it("exposes the compact size on native form primitives", () => {
		const input = render(Input, { "data-size": "compact", "aria-label": "Name" });
		expect(input.getByLabelText("Name").getAttribute("data-size")).toBe("compact");

		const select = render(Select, { size: "compact", "aria-label": "Status" });
		expect(select.getByLabelText("Status").getAttribute("data-size")).toBe("compact");
	});

	it("exposes the compact size on stateful primitives", () => {
		const checkbox = render(Checkbox, { size: "compact", "aria-label": "Enabled" });
		expect(checkbox.getByRole("checkbox").getAttribute("data-size")).toBe("compact");

		const badge = render(Badge, { size: "compact" });
		expect(badge.container.querySelector('[data-slot="badge"]')?.getAttribute("data-size")).toBe("compact");
	});
});
