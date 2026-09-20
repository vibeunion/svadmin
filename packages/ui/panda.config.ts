import { defineConfig } from "@pandacss/dev";

const semanticColors = {
	background: { value: "var(--background)" },
	foreground: { value: "var(--foreground)" },
	card: { value: "var(--card)" },
	"card-foreground": { value: "var(--card-foreground)" },
	popover: { value: "var(--popover)" },
	"popover-foreground": { value: "var(--popover-foreground)" },
	primary: { value: "var(--primary)" },
	"primary-foreground": { value: "var(--primary-foreground)" },
	secondary: { value: "var(--secondary)" },
	"secondary-foreground": { value: "var(--secondary-foreground)" },
	muted: { value: "var(--muted)" },
	"muted-foreground": { value: "var(--muted-foreground)" },
	accent: { value: "var(--accent)" },
	"accent-foreground": { value: "var(--accent-foreground)" },
	destructive: { value: "var(--destructive)" },
	"destructive-foreground": { value: "var(--destructive-foreground)" },
	border: { value: "var(--border)" },
	input: { value: "var(--input)" },
	ring: { value: "var(--ring)" },
	success: { value: "var(--success)" },
	"success-foreground": { value: "var(--success-foreground)" },
	warning: { value: "var(--warning)" },
	"warning-foreground": { value: "var(--warning-foreground)" },
	info: { value: "var(--info)" },
	"info-foreground": { value: "var(--info-foreground)" },
};

const buttonVariants = {
	variant: {
		default: {
			background: "primary",
			color: "primary-foreground",
			_hover: { background: "color-mix(in srgb, var(--primary) 88%, black)" },
		},
		outline: {
			background: "transparent",
			color: "foreground",
			borderWidth: "1px",
			borderColor: "input",
			_hover: { background: "accent", color: "accent-foreground" },
		},
		secondary: {
			background: "secondary",
			color: "secondary-foreground",
			_hover: { background: "muted" },
		},
		ghost: {
			background: "transparent",
			color: "foreground",
			_hover: { background: "accent", color: "accent-foreground" },
		},
		destructive: {
			background: "destructive",
			color: "destructive-foreground",
			_hover: { background: "color-mix(in srgb, var(--destructive) 88%, black)" },
		},
		link: {
			background: "transparent",
			color: "primary",
			textDecoration: "underline",
			textUnderlineOffset: "4px",
		},
	},
	size: {
		default: { minHeight: "2.25rem", paddingInline: "0.75rem" },
		xs: { minHeight: "1.5rem", paddingInline: "0.5rem", fontSize: "0.75rem" },
		sm: { minHeight: "2rem", paddingInline: "0.75rem", fontSize: "0.8rem" },
		lg: { minHeight: "2.5rem", paddingInline: "1rem" },
		icon: { width: "2.25rem", height: "2.25rem", padding: "0" },
		"icon-xs": { width: "1.5rem", height: "1.5rem", padding: "0" },
		"icon-sm": { width: "2rem", height: "2rem", padding: "0" },
		"icon-lg": { width: "2.5rem", height: "2.5rem", padding: "0" },
	},
};

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
