import { Outlet } from "react-router";
import WebexMeetingsActions from "./actions";

export function WebexMeetingsLayout() {
	return (
		<>
			<WebexMeetingsActions />
			<Outlet />
		</>
	);
}
