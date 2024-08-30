import { Outlet } from "react-router-dom";
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
