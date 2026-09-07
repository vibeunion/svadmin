export type AvatarSize = "default" | "sm" | "lg" | "xl";

export const avatarVariants = ({
  size = "default", class: className = "", className: extraClassName = "",
}: { size?: AvatarSize | null; class?: Parameters<typeof clsx>[number]; className?: Parameters<typeof clsx>[number] } = {}): string =>
  clsx("svadmin-avatar", size && `svadmin-avatar-size--${size}`, className, extraClassName);
import { clsx } from "cn/engine";
