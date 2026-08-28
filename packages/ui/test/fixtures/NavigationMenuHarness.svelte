<script lang="ts">
	import * as NavigationMenu from '../../src/components/ui/navigation-menu/index.js';

	let value = $state('products');
</script>

<NavigationMenu.Root bind:value>
	<NavigationMenu.List>
		<NavigationMenu.Item value="products">
			<NavigationMenu.Trigger>Products</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<NavigationMenu.Link href="/payments">Payments Infrastructure</NavigationMenu.Link>
				<NavigationMenu.Link href="/billing">Subscription Billing</NavigationMenu.Link>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
		<NavigationMenu.Item value="pricing">
			<NavigationMenu.Link href="/pricing">Pricing</NavigationMenu.Link>
		</NavigationMenu.Item>
	</NavigationMenu.List>
</NavigationMenu.Root>

<output data-testid="nav-value">{value}</output>
