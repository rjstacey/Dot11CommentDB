import { Outlet } from "react-router";
import { ReportsActions } from "./actions";

export function ReportsLayout() {
	return (
		<>
			<ReportsActions />
			<Outlet />
		</>
	);
}
