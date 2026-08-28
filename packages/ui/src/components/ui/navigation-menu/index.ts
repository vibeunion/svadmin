import { NavigationMenu as NavigationMenuPrimitive } from "bits-ui";
import Root from "./navigation-menu.svelte";
import List from "./navigation-menu-list.svelte";
import Item from "./navigation-menu-item.svelte";
import Trigger from "./navigation-menu-trigger.svelte";
import Content from "./navigation-menu-content.svelte";
import Link from "./navigation-menu-link.svelte";
import Viewport from "./navigation-menu-viewport.svelte";
import Indicator from "./navigation-menu-indicator.svelte";

const Sub = NavigationMenuPrimitive.Sub;

export {
	Root,
	List,
	Item,
	Trigger,
	Content,
	Link,
	Viewport,
	Indicator,
	Sub,
	//
	Root as NavigationMenu,
	List as NavigationMenuList,
	Item as NavigationMenuItem,
	Trigger as NavigationMenuTrigger,
	Content as NavigationMenuContent,
	Link as NavigationMenuLink,
	Viewport as NavigationMenuViewport,
	Indicator as NavigationMenuIndicator,
	Sub as NavigationMenuSub,
};
