import { Menu } from "./Menu";
import { AccountDropdown } from "./AccountDropdown";
import { useMenuItems } from "./useMenuItems";

function Header(props: React.ComponentProps<"header">) {
	const menuItems = useMenuItems();
	return (
		<header {...props}>
			<Menu>{menuItems}</Menu>
			<AccountDropdown />
		</header>
	);
}

export default Header;
