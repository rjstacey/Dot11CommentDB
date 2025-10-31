import { Outlet } from "react-router";
import { SessionAttendanceActions } from "./actions";

export function SessionNumberLayout() {
	return (
		<>
			<SessionAttendanceActions />
			<Outlet />
		</>
	);
}

export default SessionNumberLayout;
