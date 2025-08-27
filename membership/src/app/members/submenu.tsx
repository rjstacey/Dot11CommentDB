import { Col, Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router";

export function MembersSubmenu(props: React.ComponentProps<typeof Col>) {
	const location = useLocation();
	const rosterShown = /roster$/.test(location.pathname);

	return (
		<Col className="align-items-center m-3" {...props}>
			<Nav variant="underline">
				<Nav.Link
					as={Link}
					to={rosterShown ? ".." : "."}
					active={!rosterShown}
				>
					Members
				</Nav.Link>
				<Nav.Link
					as={Link}
					to={rosterShown ? "." : "roster"}
					active={rosterShown}
				>
					Roster
				</Nav.Link>
			</Nav>
		</Col>
	);
}
