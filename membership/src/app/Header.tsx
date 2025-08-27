import { Container } from "react-bootstrap";
import { Menu } from "./Menu";
import { AccountDropdown } from "./AccountDropdown";

function Header() {
	return (
		<Container
			as="header"
			fluid
			className="d-flex flex-row justify-content-between align-items-center bg-body-tertiary "
		>
			<Menu />
			<AccountDropdown />
		</Container>
	);
}

export default Header;
