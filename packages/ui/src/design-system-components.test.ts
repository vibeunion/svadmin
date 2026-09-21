import { describe, expect, it } from "vitest";
import { designSystemComponents } from "./design-system-components.js";

describe("design system component contract", () => {
	it("defines a complete contract for every component set", () => {
		expect(designSystemComponents).toHaveLength(11);
		expect(new Set(designSystemComponents.map((component) => component.id)).size).toBe(
			designSystemComponents.length,
		);

		for (const component of designSystemComponents) {
			expect(component.codePath).toMatch(/^packages\/ui\/src\//);
			expect(component.states.length).toBeGreaterThan(0);
			expect(component.themes).toEqual(["light", "dark"]);
			expect(component.sizes).toEqual(["default", "compact"]);
		}
	});
});
