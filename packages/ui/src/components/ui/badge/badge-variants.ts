import { badgeRecipe as uiBadge, type BadgeRecipeProps } from '../../../recipes.js';

export type BadgeVariant = NonNullable<BadgeRecipeProps["variant"]>;

export const badgeVariants = ({
  variant, class: className = "", className: extraClassName = "",
}: { variant?: BadgeVariant | null | undefined; class?: string; className?: string } = {}): string =>
  uiBadge({ variant, class: [className, extraClassName].filter(Boolean).join(" ") }).root;
