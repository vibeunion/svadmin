export type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

export const buttonVariants = ({
	variant = "default",
	size = "default",
  class: className = "",
  className: extraClassName = "",
}: {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
	class?: string;
	className?: string;
} = {}): string =>
	[
		"svadmin-button",
		variant && `svadmin-button--${variant}`,
		size && `svadmin-button-size--${size}`,
		className,
		extraClassName,
	]
		.filter(Boolean)
		.join(" ");
