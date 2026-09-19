import { describe, expect, it } from "vitest";
import { surfaceDesignContract } from "./design-contract.js";
import { metricSurfaceClasses, tableSurfaceClasses } from "./design-system.js";

describe("Panda design contract", () => {
	it("publishes the constrained semantic surface contract", () => {
		expect(surfaceDesignContract.version).toBe("svadmin/design-v1");
		expect(surfaceDesignContract.metric.tone).toEqual(["neutral", "success", "warning", "danger", "info"]);
		expect(surfaceDesignContract.table.density).toEqual(["comfortable", "compact"]);
	});

	it("generates typed slot classes for representative surfaces", () => {
		const metric = metricSurfaceClasses("success");
		const table = tableSurfaceClasses("compact");

		expect(metric.root).toContain("surface-metric__root");
		expect(metric.card).toContain("surface-metric__card");
		expect(table.root).toContain("surface-table__root");
		expect(table.cell).toContain("surface-table__cell");
	});
});
