export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "subtle"
  | "subtle-success"
  | "subtle-warning"
  | "subtle-destructive"
  | "subtle-pill"
  | "outline"
  | "ghost"
  | "link";

export const badgeVariants = ({
  variant = "default", class: className = "", className: extraClassName = "",
}: { variant?: BadgeVariant | null; class?: Parameters<typeof clsx>[number]; className?: Parameters<typeof clsx>[number] } = {}): string =>
  clsx("svadmin-badge", variant && `svadmin-badge--${variant}`, className, extraClassName);
import { clsx } from "cn/engine";
