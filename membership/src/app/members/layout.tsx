import { Outlet } from "react-router";
import { MembersActions } from "./actions";

export function Members() {
	return (
		<>
			<MembersActions />
			<Outlet />
		</>
	);
}
