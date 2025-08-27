import { Col, Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router";

export function SessionAttendanceSubmenu(
	props: React.ComponentProps<typeof Col>
) {
	const location = useLocation();
	const registrationShown = /registration$/.test(location.pathname);

	return (
		<Col className="align-items-center m-3" {...props}>
			<Nav variant="underline">
				<Nav.Link
					as={Link}
					to={registrationShown ? ".." : "."}
					active={!registrationShown}
				>
					Attendance
				</Nav.Link>
				<Nav.Link
					as={Link}
					to={registrationShown ? "." : "registration"}
					active={registrationShown}
				>
					Registration
				</Nav.Link>
			</Nav>
		</Col>
	);
}
