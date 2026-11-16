export type AvatarSize = "default" | "sm" | "lg" | "xl";
export type AvatarShape = "circle" | "square";

export const avatarVariants = ({
  size = "default", shape = "circle", class: className = "", className: extraClassName = "",
}: { size?: AvatarSize | null; shape?: AvatarShape | null; class?: string; className?: string } = {}): string =>
  [
    "svadmin-avatar",
    size && `svadmin-avatar-size--${size}`,
    shape && `svadmin-avatar-shape--${shape}`,
    className,
    extraClassName,
  ].filter(Boolean).join(" ");
