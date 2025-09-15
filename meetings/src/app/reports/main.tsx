import { Outlet } from "react-router";
import ReportsActions from "./actions";

function ReportsLayout() {
	return (
		<>
			<ReportsActions />
			<Outlet />
		</>
	);
}

export default ReportsLayout;
