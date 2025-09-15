import { Outlet } from "react-router";
import MeetingsActions from "./actions";

export function MainLayout() {
	return (
		<>
			<MeetingsActions />
			<Outlet />
		</>
	);
}
