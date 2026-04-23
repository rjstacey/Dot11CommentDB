import { Container } from "react-bootstrap";
import { AccountDropdown } from "./AccountDropdown";
import { LiveUpdateSwitch } from "./LiveUpdateSwitch";
import { OnlineIndicator } from "./OnlineIndicator";
import { Menu } from "./Menu";
import { useMenuItems } from "./useMenuItems";

function Header() {
	const menuItems = useMenuItems();
	return (
		<Container as="header" fluid className="bg-body-tertiary">
			<Menu>{menuItems}</Menu>
			<div className="d-flex justify-content-end align-items-center gap-2 p-2">
				<OnlineIndicator />
				<LiveUpdateSwitch />
				<AccountDropdown />
			</div>
		</Container>
	);
}

export default Header;
