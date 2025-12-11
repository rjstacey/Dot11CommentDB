import { Outlet } from "react-router";
import ImatBreakoutsActions from "./actions";

export function ImatBreakoutsLayout() {
	return (
		<>
			<ImatBreakoutsActions />
			<Outlet />
		</>
	);
}
