export type AlertVariant = "default" | "destructive" | "warning" | "success";

export const alertVariants = ({
  variant = "default", class: className = "", className: extraClassName = "",
}: { variant?: AlertVariant | null; class?: string; className?: string } = {}): string =>
  ["svadmin-alert", variant && `svadmin-alert--${variant}`, className, extraClassName].filter(Boolean).join(" ");
