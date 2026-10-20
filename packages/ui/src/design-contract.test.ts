import { describe, expect, it } from "vitest";
import { surfaceDesignContract } from "./design-contract.js";
import { metricSurfaceClasses, tableSurfaceClasses } from "./design-system.js";

describe("Semantic design contract", () => {
	it("publishes the constrained semantic surface contract", () => {
		expect(surfaceDesignContract.version).toBe("svadmin/design-v1");
		expect(surfaceDesignContract.metric.tone).toEqual(["neutral", "success", "warning", "danger", "info"]);
		expect(surfaceDesignContract.metric.density).toEqual(["comfortable", "compact"]);
		expect(surfaceDesignContract.table.density).toEqual(["comfortable", "compact"]);
		expect(surfaceDesignContract.pageFamilies).toEqual(["list", "form", "detail", "workspace", "dashboard"]);
		expect(surfaceDesignContract.pageStates).toEqual(["ready", "loading", "empty", "filtered-empty", "error", "forbidden"]);
		expect(surfaceDesignContract.composition).toEqual({
			maxPrimaryActions: 1,
			secondaryActions: "overflow",
			destructiveActions: "confirm",
			modalNesting: 0,
		});
	});

	it("generates typed slot classes for representative surfaces", () => {
		const metric = metricSurfaceClasses("success");
		const table = tableSurfaceClasses();

		expect(metric.root).toContain("surface-metric__root");
		expect(metric.card).toContain("surface-metric__card");
		expect(table.root).toContain("surface-table__root");
		expect(table.cell).toContain("surface-table__cell");
	});
});
