import { Navbar, Nav, Button, Container, Placeholder } from "react-bootstrap";
import { useParams } from "react-router";

const appName = "Comments";
export default function AppFallback() {
	const { groupName } = useParams();
	const title = (groupName ? groupName + " " : "") + appName;
	if (document.title !== title) document.title = title;

	const menuItems = Array.from({ length: 4 }).map((_, idx) => (
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
				className="d-flex flex-row justify-content-between align-items-center bg-body-tertiary "
			>
				<Navbar expand="xl" className="justify-content-between">
					<Navbar.Brand href="/">{title}</Navbar.Brand>
					<Navbar.Toggle aria-controls="basic-navbar-nav" />
					<Navbar.Collapse id="basic-navbar-nav">
						<Nav variant="underline" className="me-auto">
							{menuItems}
						</Nav>
					</Navbar.Collapse>
				</Navbar>

				<Placeholder as={Button} style={{ width: 180 }} />
			</Container>
			<Placeholder as="main" className="main" animation="glow" />
		</>
	);
}
