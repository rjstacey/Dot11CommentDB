import { Container } from "react-bootstrap";
import { Menu } from "./menu";
import { AccountDropdown } from "./AccountDropdown";
import LiveUpdateSwitch from "./LiveUpdateSwitch";
import OnlineIndicator from "./OnlineIndicator";

function Header() {
	return (
		<Container
			as="header"
			fluid
			className="d-flex flex-row justify-content-between align-items-start bg-body-tertiary "
		>
			<Menu />
			<div className="d-flex justify-content-end flex-wrap align-items-center gap-2 p-2">
				<OnlineIndicator />
				<LiveUpdateSwitch />
				<AccountDropdown />
			</div>
		</Container>
	);
}

export default Header;
