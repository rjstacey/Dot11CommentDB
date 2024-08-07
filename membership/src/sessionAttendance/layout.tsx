import { Outlet } from "react-router-dom";
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
