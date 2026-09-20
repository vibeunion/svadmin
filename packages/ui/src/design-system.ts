import { field, surfaceMetric, surfaceTable } from "./styled-system/recipes/index.js";
import type { DesignTone, FieldState, SurfaceDensity } from "./design-contract.js";

export function fieldClasses(state: FieldState = "default"): Record<string, string> {
	return field({ state });
}

export function metricSurfaceClasses(tone: SurfaceTone = "neutral") {
	return surfaceMetric({ tone });
}

export function tableSurfaceClasses(density: SurfaceDensity = "comfortable") {
	return surfaceTable({ density });
}
