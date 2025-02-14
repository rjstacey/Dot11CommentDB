import { Outlet } from "react-router";
import { SessionAttendanceActions } from "./actions";

export function SessionAttendanceLayout() {
	return (
		<>
			<SessionAttendanceActions />
			<Outlet />
		</>
	);
}
