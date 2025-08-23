import { NavLink, Outlet } from "react-router";
import { Container, Row, Col, Nav, Button } from "react-bootstrap";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";

export function Reports() {
	return (
		<Container fluid className="d-flex flex-grow-1 w-100">
			<Nav variant="pills" className="flex-column">
				<Nav.Link as={NavLink} to="members">
					Members by Affiliation
				</Nav.Link>
				<Nav.Link as={NavLink} to="sessionParticipation/per-session">
					Per Session Participation
				</Nav.Link>
				<Nav.Link as={NavLink} to="sessionParticipation/cumulative">
					Cumulative Session Participation
				</Nav.Link>
			</Nav>
			<Container fluid className="d-flex flex-column p-3">
				<Row>
					<Col className="d-flex justify-content-end gap-2">
						<Button
							variant="outline-primary"
							className="bi-copy"
							title="Copy chart to clipboard"
							onClick={() => copyChartToClipboard("#chart")}
						/>
						<Button
							variant="outline-primary"
							className="bi-cloud-download"
							title="Export chart"
							onClick={downloadChart}
						/>
					</Col>
				</Row>
				<Outlet />
			</Container>
		</Container>
	);
}

export default Reports;
