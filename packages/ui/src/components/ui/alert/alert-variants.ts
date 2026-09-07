export type AlertVariant = "default" | "destructive" | "warning" | "success";

export const alertVariants = ({
  variant = "default", class: className = "", className: extraClassName = "",
}: { variant?: AlertVariant | null; class?: Parameters<typeof clsx>[number]; className?: Parameters<typeof clsx>[number] } = {}): string =>
  clsx("svadmin-alert", variant && `svadmin-alert--${variant}`, className, extraClassName);
import { clsx } from "cn/engine";
