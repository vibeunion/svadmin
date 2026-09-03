export { cn } from "cn";

/**
* A utility type that makes the `ref` prop optional and adds it to the given props type.
*/
export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
	ref?: E | null;
};

/**
 * A utility type that removes `children` and `child` from the given props type.
 */
export type WithoutChildrenOrChild<T> = T extends infer U
	? Omit<U, "children" | "child">
	: never;

/**
 * A utility type that removes `children` from the given props type (keeps `child`).
 */
export type WithoutChildren<T> = T extends infer U
	? Omit<U, "children">
	: never;
