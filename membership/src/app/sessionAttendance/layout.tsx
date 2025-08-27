import { Outlet } from "react-router";
import { Container } from "react-bootstrap";
import { SessionAttendanceActions } from "./actions";

export function SessionAttendance() {
	return (
		<Container
			fluid
			className="d-flex flex-wrap h-100 w-100 justify-content-between"
		>
			<SessionAttendanceActions />
			<Outlet />
		</Container>
	);
}

export default SessionAttendance;
