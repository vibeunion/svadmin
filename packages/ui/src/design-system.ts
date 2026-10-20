import { surfaceMetricRecipe as surfaceMetric, surfaceTableRecipe as surfaceTable } from "./recipes.js";
import type { SurfaceDensity, SurfaceTone } from "./design-contract.js";

export function metricSurfaceClasses(tone: SurfaceTone = "neutral") {
	return surfaceMetric({ tone });
}

/** @deprecated The argument is accepted for compatibility and uses the shared baseline. */
export function tableSurfaceClasses(_density: SurfaceDensity = "comfortable") {
	return surfaceTable();
}
