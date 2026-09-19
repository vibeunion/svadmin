export const DESIGN_CONTRACT_VERSION = "1";

export const designTones = ["default", "primary", "success", "warning", "danger", "info"] as const;
export type DesignTone = (typeof designTones)[number];

export const surfaceDensities = ["comfortable", "compact"] as const;
export type SurfaceDensity = (typeof surfaceDensities)[number];

export const semanticColorTokens = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"destructive-foreground",
	"border",
	"input",
	"ring",
	"success",
	"success-foreground",
	"warning",
	"warning-foreground",
	"info",
	"info-foreground",
] as const;

export type SemanticColorToken = (typeof semanticColorTokens)[number];

export const designContract = {
	version: DESIGN_CONTRACT_VERSION,
	tones: designTones,
	densities: surfaceDensities,
	semanticColorTokens,
} as const;
