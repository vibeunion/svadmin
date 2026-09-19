import { uiBadge } from '../../../styled-system/recipes/index.js';

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
}: { variant?: BadgeVariant | null; class?: string; className?: string } = {}): string =>
  ["svadmin-badge", variant && `svadmin-badge--${variant}`,
    uiBadge(variant ? { variant } : {}), className, extraClassName].filter(Boolean).join(" ");
