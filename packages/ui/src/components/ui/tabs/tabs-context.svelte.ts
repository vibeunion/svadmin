import { createContext } from 'svelte';

export type TabsVariant = "default" | "line" | "card";
export type TabsOrientation = "horizontal" | "vertical";

export interface TabsContextValue {
	readonly value: string;
	readonly variant?: TabsVariant | undefined;
	readonly orientation?: TabsOrientation | undefined;
	select: (value: string) => void;
}

export const [getTabsContext, setTabsContext] = createContext<TabsContextValue>();
