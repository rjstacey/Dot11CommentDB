import { Col, Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router";

export function BallotsSubmenu(props: React.ComponentProps<typeof Col>) {
	const location = useLocation();
	const epollsShown = /epolls$/.test(location.pathname);

	return (
		<Col className="align-items-center" {...props}>
			<Nav variant="underline">
				<Nav.Link as={Link} to="../ballots" active={!epollsShown}>
					Ballots
				</Nav.Link>
				<Nav.Link as={Link} to="../epolls" active={epollsShown}>
					ePolls
				</Nav.Link>
			</Nav>
		</Col>
	);
}
