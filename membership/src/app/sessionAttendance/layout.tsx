import { Outlet } from "react-router";
import { SessionAttendanceActions } from "./actions";

export function SessionAttendance() {
	return (
		<>
			<SessionAttendanceActions />
			<Outlet />
		</>
	);
}
