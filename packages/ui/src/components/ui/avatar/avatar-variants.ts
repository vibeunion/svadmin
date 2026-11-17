export type AvatarSize = "mini" | "small" | "sm" | "default" | "large" | "lg" | "xl" | number;
export type AvatarShape = "circle" | "square";

const SIZE_CLASS_MAP: Record<string, string> = {
  mini: "mini",
  small: "sm",
  sm: "sm",
  default: "default",
  large: "lg",
  lg: "lg",
  xl: "xl",
};

export const avatarVariants = ({
  size = "default", shape = "circle", class: className = "", className: extraClassName = "",
}: { size?: AvatarSize | null; shape?: AvatarShape | null; class?: string; className?: string } = {}): string => {
  const sizeClass = typeof size === "string" && size in SIZE_CLASS_MAP ? SIZE_CLASS_MAP[size] : undefined;
  return [
    "svadmin-avatar",
    sizeClass && `svadmin-avatar-size--${sizeClass}`,
    shape && `svadmin-avatar-shape--${shape}`,
    className,
    extraClassName,
  ].filter(Boolean).join(" ");
};
