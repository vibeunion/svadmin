import { uiButton } from '../../../styled-system/recipes/index.js';

export type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

// 保留公开 helper、语义标记和 null 行为；样式由预生成 Panda recipe 提供。
export const buttonVariants = ({
  variant = "default",
  size = "default",
  class: className = "",
  className: extraClassName = "",
}: {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  class?: string;
  className?: string;
} = {}): string =>
  ["svadmin-button", variant && `svadmin-button--${variant}`, size && `svadmin-button-size--${size}`,
    uiButton({ ...(variant ? { variant } : {}), ...(size ? { size } : {}) }),
    className, extraClassName].filter(Boolean).join(" ");
