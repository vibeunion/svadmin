export type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

// Keep the public helper for composition, while styles are owned by app.css.
export const buttonVariants = ({
  variant = "default",
  size = "default",
  class: className = "",
  className: extraClassName = "",
}: {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  class?: Parameters<typeof clsx>[number];
  className?: Parameters<typeof clsx>[number];
} = {}): string =>
  clsx("svadmin-button", variant && `svadmin-button--${variant}`, size && `svadmin-button-size--${size}`, className, extraClassName);
import { clsx } from "cn/engine";
