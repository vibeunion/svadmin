export type AvatarSize = "default" | "sm" | "lg" | "xl";

export const avatarVariants = ({
  size = "default", class: className = "", className: extraClassName = "",
}: { size?: AvatarSize | null; class?: string; className?: string } = {}): string =>
  ["svadmin-avatar", size && `svadmin-avatar-size--${size}`, className, extraClassName].filter(Boolean).join(" ");
