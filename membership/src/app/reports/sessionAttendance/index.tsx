import { Outlet } from "react-router";
import { SessionSelectorNav } from "../../sessionAttendance/actions/SessionSelectorNav";
import { ChartActions } from "../ChartActions";

export default function SessionAttendanceReport() {
	return (
		<div className="d-flex flex-column flex-grow-1">
			<div className="d-flex w-100">
				<SessionSelectorNav />
				<ChartActions />
			</div>
			<Outlet />
		</div>
	);
}
