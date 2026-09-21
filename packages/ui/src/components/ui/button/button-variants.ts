import { buttonRecipe, type ButtonRecipeProps } from '../../../recipes.js';

export type ButtonVariant = NonNullable<ButtonRecipeProps["variant"]>;
export type ButtonSize = NonNullable<ButtonRecipeProps["size"]>;

// 只组合语义类，不要求消费者安装 Tailwind 编译器或 class merger。
export const buttonVariants = ({
  variant,
  size,
  class: className = "",
  className: extraClassName = "",
}: {
  variant?: ButtonVariant | null | undefined;
  size?: ButtonSize | null | undefined;
  class?: string;
  className?: string;
} = {}): string =>
  buttonRecipe({
    variant,
    size,
    class: [className, extraClassName].filter(Boolean).join(" "),
  }).root;
