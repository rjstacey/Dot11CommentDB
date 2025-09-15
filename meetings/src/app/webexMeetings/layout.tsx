import { Outlet } from "react-router";
import WebexMeetingsActions from "./actions";

function WebexMeetingsLayout() {
	return (
		<>
			<WebexMeetingsActions />
			<Outlet />
		</>
	);
}

export default WebexMeetingsLayout;
