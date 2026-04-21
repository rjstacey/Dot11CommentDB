import { Nav, Container, Button, Placeholder } from "react-bootstrap";
import { Menu } from "./header/Menu";

function AccountDropdown() {
	return (
		<Button variant="outline-secondary" disabled>
			Loading...
		</Button>
	);
}

export function AppFallback() {
	const menuItems = Array.from({ length: 8 }).map((_, idx) => (
		<Nav.Item key={idx}>
			<Placeholder
				as={Nav.Link}
				style={{ width: 100, backgroundColor: "gray" }}
				animation="wave"
			/>
		</Nav.Item>
	));

	return (
		<>
			<Container
				as="header"
				fluid
				className="d-flex flex-row justify-content-between align-items-center gap-2 bg-body-tertiary"
			>
				<Menu>{menuItems}</Menu>
				<AccountDropdown />
			</Container>
			<Placeholder as="main" className="main" animation="glow" />
		</>
	);
}
