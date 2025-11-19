import { Nav } from "react-bootstrap";
import { Link, useLocation, useParams } from "react-router";

export function SessionAttendanceSubmenu(
	props: React.ComponentProps<typeof Nav>
) {
	const { sessionNumber } = useParams();
	const { pathname, search } = useLocation();
	return (
		<Nav
			variant="underline"
			className="col-auto d-flex align-items-center ms-3 me-3"
			{...props}
		>
			<Nav.Link
				as={Link}
				to={{ pathname: `${sessionNumber}/imat`, search }}
				active={/imat$/i.test(pathname)}
			>
				IMAT
			</Nav.Link>
			<Nav.Link
				as={Link}
				to={{ pathname: `${sessionNumber}/registration`, search }}
				active={/registration$/i.test(pathname)}
			>
				Registration
			</Nav.Link>
			<Nav.Link
				as={Link}
				to={{ pathname: `${sessionNumber}/summary`, search }}
				active={/summary$/i.test(pathname)}
			>
				Summary
			</Nav.Link>
		</Nav>
	);
}
