export type AvatarSize = "default" | "mini" | "small" | "sm" | "large" | "lg" | "xl" | number;
export type AvatarShape = "circle" | "square";

export const avatarVariants = ({
  size = "default", shape = "circle", class: className = "", className: extraClassName = "",
}: { size?: AvatarSize | null; shape?: AvatarShape | null; class?: string; className?: string } = {}): string => {
  const normalizedSize = size === "small" ? "sm" : size === "large" ? "lg" : size;
  return [
    "svadmin-avatar",
    normalizedSize && typeof normalizedSize === "string" && `svadmin-avatar-size--${normalizedSize}`,
    shape && `svadmin-avatar-shape--${shape}`,
    className,
    extraClassName,
  ].filter(Boolean).join(" ");
};
