import { Container } from "react-bootstrap";
import { Menu } from "./Menu";
import { AccountDropdown } from "./AccountDropdown";
import { useMenuItems } from "./useMenuItems";

function Header() {
	const menuItems = useMenuItems();
	return (
		<Container
			as="header"
			fluid
			className="d-flex flex-row justify-content-between align-items-center gap-2 bg-body-tertiary"
		>
			<Menu>{menuItems}</Menu>
			<AccountDropdown />
		</Container>
	);
}

export default Header;
