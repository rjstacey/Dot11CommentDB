import { Outlet } from "react-router";
import { ReportsActions } from "./actions";

export function ReportsRootLayout() {
	return (
		<>
			<ReportsActions />
			<Outlet />
		</>
	);
}
