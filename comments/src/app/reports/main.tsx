import { Outlet, useParams, NavLink } from "react-router";
import { Nav, Container } from "react-bootstrap";
import { commentReports } from "./reportData";

const reports = Object.keys(commentReports) as (keyof typeof commentReports)[];

export function ReportsMainLayout() {
	const { report } = useParams();

	return (
		<Container fluid className="d-flex flex-grow overflow-hidden">
			<Nav variant="underline" className="flex-column me-3">
				<h3>Select a report:</h3>
				{reports.map((r) => (
					<Nav.Link key={r} as={NavLink} to={r} active={r === report}>
						{commentReports[r].label}
					</Nav.Link>
				))}
			</Nav>
			<Outlet />
		</Container>
	);
}
