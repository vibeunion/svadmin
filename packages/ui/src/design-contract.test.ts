import { describe, expect, it } from "vitest";
import { designContract, DESIGN_CONTRACT_VERSION, semanticColorTokens } from "./design-contract.js";
import { fieldClasses, metricSurfaceClasses, tableSurfaceClasses } from "./design-system.js";

describe("Panda design contract", () => {
	it("publishes the constrained semantic surface contract", () => {
		expect(DESIGN_CONTRACT_VERSION).toBe("1");
		expect(designContract.tones).toEqual(["default", "primary", "success", "warning", "danger", "info"]);
		expect(designContract.densities).toEqual(["comfortable", "compact"]);
		expect(designContract.fieldStates).toEqual(["default", "error", "success", "disabled"]);
		expect(semanticColorTokens).toContain("primary");
		expect(semanticColorTokens).not.toContain("brand-typo" as never);
	});

	it("generates typed slot classes for representative surfaces", () => {
		const metric = metricSurfaceClasses("success");
		const table = tableSurfaceClasses("compact");
		const field = fieldClasses("error");

		expect(field["root"]).toContain("svadmin-panda-field__root");
		expect(field["label"]).toContain("svadmin-panda-field__label--state_error");
		expect(metric["root"]).toContain("svadmin-panda-metric__root");
		expect(metric["value"]).toContain("svadmin-panda-metric__value");
		expect(table["root"]).toContain("svadmin-panda-table__root");
		expect(table["cell"]).toContain("svadmin-panda-table__cell");
	});
});
