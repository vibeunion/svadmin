/* eslint-disable */
export type Token = `radii.${RadiusToken}` | `fontSizes.${FontSizeToken}` | `breakpoints.${BreakpointToken}` | `sizes.${SizeToken}` | `colors.${ColorToken}`

export type ColorPalette = "background" | "foreground" | "card" | "card-foreground" | "popover" | "popover-foreground" | "primary" | "primary-foreground" | "secondary" | "secondary-foreground" | "muted" | "muted-foreground" | "accent" | "accent-foreground" | "destructive" | "destructive-foreground" | "border" | "input" | "ring" | "success" | "success-foreground" | "warning" | "warning-foreground" | "info" | "info-foreground"

export type RadiusToken = "sm" | "md" | "lg" | "xl"

export type FontSizeToken = "xs" | "sm" | "md" | "lg"

export type BreakpointToken = "sm" | "md" | "lg" | "xl" | "2xl"

export type SizeToken = "breakpoint-sm" | "breakpoint-md" | "breakpoint-lg" | "breakpoint-xl" | "breakpoint-2xl"

export type ColorToken = "background" | "foreground" | "card" | "card-foreground" | "popover" | "popover-foreground" | "primary" | "primary-foreground" | "secondary" | "secondary-foreground" | "muted" | "muted-foreground" | "accent" | "accent-foreground" | "destructive" | "destructive-foreground" | "border" | "input" | "ring" | "success" | "success-foreground" | "warning" | "warning-foreground" | "info" | "info-foreground" | "colorPalette"

export type Tokens = {
		radii: RadiusToken
		fontSizes: FontSizeToken
		breakpoints: BreakpointToken
		sizes: SizeToken
		colors: ColorToken
} & { [token: string]: never }

export type TokenCategory = "aspectRatios" | "zIndex" | "opacity" | "colors" | "fonts" | "fontSizes" | "fontWeights" | "lineHeights" | "letterSpacings" | "sizes" | "cursor" | "shadows" | "spacing" | "radii" | "borders" | "borderWidths" | "durations" | "easings" | "animations" | "blurs" | "gradients" | "breakpoints" | "assets"