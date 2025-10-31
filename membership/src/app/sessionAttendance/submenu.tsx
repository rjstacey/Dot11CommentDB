import { Col, Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router";

export function SessionAttendanceSubmenu(
	props: React.ComponentProps<typeof Col>
) {
	const { pathname, search } = useLocation();
	return (
		<Col className="align-items-center m-3" {...props}>
			<Nav variant="underline">
				<Nav.Link
					as={Link}
					to={{ pathname: "imat", search }}
					active={/imat$/i.test(pathname)}
				>
					IMAT
				</Nav.Link>
				<Nav.Link
					as={Link}
					to={{ pathname: "registration", search }}
					active={/registration$/i.test(pathname)}
				>
					Registration
				</Nav.Link>
				<Nav.Link
					as={Link}
					to={{ pathname: "summary", search }}
					active={/summary$/i.test(pathname)}
				>
					Summary
				</Nav.Link>
			</Nav>
		</Col>
	);
}
