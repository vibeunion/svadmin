import { surfaceMetricRecipe as surfaceMetric, surfaceTableRecipe as surfaceTable } from "./recipes.js";
import type { SurfaceTone, SurfaceDensity } from "./design-contract.js";

export function metricSurfaceClasses(tone: SurfaceTone = "neutral") {
	return surfaceMetric({ tone });
}

export function tableSurfaceClasses(density: SurfaceDensity = "comfortable") {
	return surfaceTable({ density });
}
