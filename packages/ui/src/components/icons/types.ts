export interface IconProps {
  /** Icon width and height in px or string */
  size?: number | string;
  /** Fill or stroke color */
  color?: string;
  /** Stroke width in px */
  strokeWidth?: number;
  /** Whether the icon has continuous rotation */
  spin?: boolean;
  /** Additional CSS class names */
  class?: string;
  /** Inline style string */
  style?: string;
  [key: string]: unknown;
}
