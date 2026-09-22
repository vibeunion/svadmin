/* eslint-disable */
export type Token = `spacing.${SpacingToken}` | `sizes.${SizeToken}` | `fontSizes.${FontSizeToken}` | `lineHeights.${LineHeightToken}` | `fontWeights.${FontWeightToken}` | `letterSpacings.${LetterSpacingToken}` | `shadows.${ShadowToken}` | `colors.${ColorToken}` | `radii.${RadiusToken}`

export type ColorPalette = "surface" | "foreground" | "muted" | "border" | "success" | "warning" | "danger" | "info" | "content"

export type SpacingToken = "xs" | "sm" | "md" | "lg" | "content.stack" | "content.inline" | "content.section" | "content.panel" | "content.page" | "-xs" | "-sm" | "-md" | "-lg" | "-content.stack" | "-content.inline" | "-content.section" | "-content.panel" | "-content.page"

export type SizeToken = "content.narrow" | "content.default" | "content.wide" | "content.description" | "content.skeletonHeight" | "content.skeletonWidth"

export type FontSizeToken = "compact" | "body" | "content.caption" | "content.body" | "content.title" | "content.metric"

export type LineHeightToken = "content.caption" | "content.body" | "content.title" | "content.description" | "content.metric"

export type FontWeightToken = "content.medium" | "content.strong"

export type LetterSpacingToken = "content.normal"

export type ShadowToken = "content.card"

export type ColorToken = "surface" | "foreground" | "muted" | "border" | "success" | "warning" | "danger" | "info" | "content.foreground" | "content.muted" | "content.card" | "content.border" | "content.positive" | "content.negative" | "content.warning" | "colorPalette" | "colorPalette.foreground" | "colorPalette.muted" | "colorPalette.card" | "colorPalette.border" | "colorPalette.positive" | "colorPalette.negative" | "colorPalette.warning"

export type RadiusToken = "surface" | "content.card"

export type Tokens = {
		spacing: SpacingToken
		sizes: SizeToken
		fontSizes: FontSizeToken
		lineHeights: LineHeightToken
		fontWeights: FontWeightToken
		letterSpacings: LetterSpacingToken
		shadows: ShadowToken
		colors: ColorToken
		radii: RadiusToken
} & { [token: string]: never }

export type TokenCategory = "aspectRatios" | "zIndex" | "opacity" | "colors" | "fonts" | "fontSizes" | "fontWeights" | "lineHeights" | "letterSpacings" | "sizes" | "cursor" | "shadows" | "spacing" | "radii" | "borders" | "borderWidths" | "durations" | "easings" | "animations" | "blurs" | "gradients" | "breakpoints" | "assets"