import { Outlet } from "react-router";
import Actions from "./actions";

function MembersLayout() {
	return (
		<>
			<Actions />
			<Outlet />
		</>
	);
}

export default MembersLayout;
