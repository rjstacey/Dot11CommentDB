import { Outlet } from "react-router";
import { ImatAttendanceActions } from "./actions";

export function ImatAttendanceLayout() {
	return (
		<>
			<ImatAttendanceActions />
			<Outlet />
		</>
	);
}
