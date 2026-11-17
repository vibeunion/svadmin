import { createContext } from 'svelte';

export type TabsVariant = "default" | "line" | "card" | "rounded" | "capsule" | "text";
export type TabsOrientation = "horizontal" | "vertical";
export type TabsSize = "mini" | "small" | "default" | "large";

export interface TabsContextValue {
	readonly value: string;
	readonly variant?: TabsVariant | undefined;
	readonly orientation?: TabsOrientation | undefined;
	readonly size?: TabsSize | undefined;
	readonly destroyOnHide?: boolean | undefined;
	select: (value: string) => void;
}

export const [getTabsContext, setTabsContext] = createContext<TabsContextValue>();
