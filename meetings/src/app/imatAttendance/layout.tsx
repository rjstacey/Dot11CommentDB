import { Outlet } from "react-router";
import ImatAttendanceActions from "./actions";

function ImatAttendanceLayout() {
	return (
		<>
			<ImatAttendanceActions />
			<Outlet />
		</>
	);
}

export default ImatAttendanceLayout;
