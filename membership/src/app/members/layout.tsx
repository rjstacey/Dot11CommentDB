import { Outlet } from "react-router";
import { MembersActions } from "./actions";

export function MembersLayout() {
	return (
		<>
			<MembersActions />
			<Outlet />
		</>
	);
}
