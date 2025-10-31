import { Outlet } from "react-router";
import { Container } from "react-bootstrap";
import { SessionSelectorNav } from "./actions/SessionSelector";

export function SessionAttendanceLayout() {
	return (
		<Container fluid className="d-flex flex-wrap h-100 w-100">
			<SessionSelectorNav style={{ order: 1 }} />
			<Outlet />
		</Container>
	);
}

export default SessionAttendanceLayout;
