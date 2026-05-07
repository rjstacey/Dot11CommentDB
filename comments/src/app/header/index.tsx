import { AccountDropdown } from "./AccountDropdown";
import { LiveUpdateSwitch } from "./LiveUpdateSwitch";
import { OnlineIndicator } from "./OnlineIndicator";
import { Menu } from "./Menu";
import { useMenuItems } from "./useMenuItems";

function Header(props: React.ComponentProps<"header">) {
	const menuItems = useMenuItems();
	return (
		<header {...props}>
			<Menu>{menuItems}</Menu>
			<div className="d-flex justify-content-end align-items-center gap-2 p-2">
				<OnlineIndicator />
				<LiveUpdateSwitch />
				<AccountDropdown />
			</div>
		</header>
	);
}

export default Header;
