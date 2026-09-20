import { field, surfaceMetric, surfaceTable } from "./styled-system/recipes/index.js";
import type { DesignTone, FieldState, SurfaceDensity } from "./design-contract.js";

export function fieldClasses(state: FieldState = "default"): Record<string, string> {
	return field({ state });
}

export function metricSurfaceClasses(tone: DesignTone = "default"): Record<string, string> {
	return surfaceMetric({ tone });
}

export function tableSurfaceClasses(density: SurfaceDensity = "comfortable"): Record<string, string> {
	return surfaceTable({ density });
}
