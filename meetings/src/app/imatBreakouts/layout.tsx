import { Outlet } from "react-router";
import ImatBreakoutsActions from "./actions";

function ImatBreakoutsLayout() {
	return (
		<>
			<ImatBreakoutsActions />
			<Outlet />
		</>
	);
}

export default ImatBreakoutsLayout;
