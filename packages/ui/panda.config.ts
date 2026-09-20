import { defineConfig } from '@pandacss/dev';
import { designTokens, semanticTokens } from './design/tokens.js';
import { surfaceMetric, surfaceTable } from './design/recipes.js';
import { uiButton, uiBadge, uiInput, uiTextarea } from './design/primitive-recipes.js';
import { productSection, productToolbar, productWorkspace, productSettings, productSettingsRow, productList, productStatus } from './design/product-recipes.js';
import { contentTokens, contentSemanticTokens } from './design/content-tokens.js';
import { contentPage, contentHeader, metricBlock } from './design/content-recipes.js';

export default defineConfig({
	preflight: true,
	strictTokens: true,
	strictPropertyValues: true,
	outExtension: "js",
	include: ["./src/**/*.{ts,svelte}"],
	outdir: "src/styled-system",
	theme: {
		semanticTokens: {
			colors: semanticColors,
		},
		tokens: {
			radii: {
				sm: { value: "calc(var(--radius) - 4px)" },
				md: { value: "calc(var(--radius) - 2px)" },
				lg: { value: "var(--radius)" },
				xl: { value: "calc(var(--radius) + 4px)" },
			},
			fontSizes: {
				xs: { value: "0.75rem" },
				sm: { value: "0.875rem" },
				md: { value: "1rem" },
				lg: { value: "1.125rem" },
			},
		},
		recipes: {
			button: {
				className: "svadmin-panda-button",
				base: {
					alignItems: "center",
					borderRadius: "md",
					display: "inline-flex",
					fontWeight: "500",
					gap: "0.5rem",
					justifyContent: "center",
					lineHeight: "1.25rem",
					transition: "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
					_userSelect: "none",
					_disabled: { opacity: "0.5", pointerEvents: "none" },
					_focusVisible: { outline: "2px solid", outlineColor: "ring", outlineOffset: "2px" },
				},
				variants: buttonVariants,
				defaultVariants: { variant: "default", size: "default" },
			},
		},
		slotRecipes: {
			field: {
				className: "svadmin-panda-field",
				slots: ["root", "label", "description", "control", "message"],
				base: {
					root: {
						display: "flex",
						flexDirection: "column",
						gap: "0.375rem",
					},
					label: {
						color: "foreground",
						fontSize: "sm",
						fontWeight: "500",
						lineHeight: "1.25rem",
					},
					description: {
						color: "muted-foreground",
						fontSize: "sm",
						lineHeight: "1.25rem",
					},
					control: {
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					},
					message: {
						color: "destructive",
						fontSize: "sm",
						lineHeight: "1.25rem",
					},
				},
				variants: {
					state: {
						default: {},
						error: {
							label: { color: "destructive" },
							control: { color: "destructive" },
						},
						success: {
							label: { color: "success" },
							control: { color: "success" },
						},
						disabled: {
							root: { opacity: "0.6" },
							label: { color: "muted-foreground" },
							control: { color: "muted-foreground" },
						},
					},
				},
				defaultVariants: { state: "default" },
			},
			surfaceMetric: {
				className: "svadmin-panda-metric",
				slots: ["root", "heading", "label", "value", "badge", "trend"],
				base: {
					root: {
						background: "card",
						borderColor: "border",
						borderRadius: "lg",
						borderWidth: "1px",
						boxShadow: "0 1px 2px rgb(15 23 42 / 0.035)",
						display: "flex",
						flexDirection: "column",
						gap: "0.75rem",
						padding: "1rem",
					},
					heading: { alignItems: "center", display: "flex", justifyContent: "space-between", gap: "0.75rem" },
					label: { color: "muted-foreground", fontSize: "sm", fontWeight: "500" },
					value: { color: "foreground", fontSize: "lg", fontVariantNumeric: "tabular-nums", fontWeight: "600" },
					badge: { borderRadius: "sm", fontSize: "xs", paddingInline: "0.375rem", paddingBlock: "0.125rem" },
					trend: { fontSize: "sm", fontVariantNumeric: "tabular-nums" },
				},
				variants: {
					tone: {
						default: { value: { color: "foreground" } },
						primary: { value: { color: "primary" } },
						success: { value: { color: "success" } },
						warning: { value: { color: "warning" } },
						danger: { value: { color: "destructive" } },
						info: { value: { color: "info" } },
					},
				},
				defaultVariants: { tone: "default" },
			},
			surfaceTable: {
				className: "svadmin-panda-table",
				slots: ["root", "head", "row", "cell"],
				base: {
					root: { background: "card", borderColor: "border", borderWidth: "1px", borderRadius: "lg", overflow: "hidden" },
					head: { background: "muted", color: "muted-foreground", fontSize: "xs", fontWeight: "600" },
					row: { borderBottomWidth: "1px", borderColor: "border", _hover: { background: "accent" } },
					cell: { color: "foreground", fontSize: "sm", paddingBlock: "0.75rem", paddingInline: "1rem" },
				},
				variants: {
					density: {
						comfortable: { cell: { paddingBlock: "0.75rem" } },
						compact: { cell: { paddingBlock: "0.5rem" } },
					},
				},
				defaultVariants: { density: "comfortable" },
			},
		},
	},
	staticCss: {
		recipes: {
			button: [{ variant: ["*"], size: ["*"] }],
			field: [{ state: ["*"] }],
			surfaceMetric: [{ tone: ["*"] }],
			surfaceTable: [{ density: ["*"] }],
		},
	},
});
