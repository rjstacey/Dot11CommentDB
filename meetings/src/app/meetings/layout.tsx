import { Outlet } from "react-router";
import MeetingsActions from "./actions";

export function MeetingsLayout() {
	return (
		<>
			<MeetingsActions />
			<Outlet />
		</>
	);
}
