import { Outlet } from "react-router";
import Actions from "./actions";

function SessionAttendanceLayout() {
	return (
		<>
			<Actions />
			<Outlet />
		</>
	);
}

export default SessionAttendanceLayout;
