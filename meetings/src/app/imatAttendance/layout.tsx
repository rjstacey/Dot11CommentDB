import { Outlet } from "react-router-dom";
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
