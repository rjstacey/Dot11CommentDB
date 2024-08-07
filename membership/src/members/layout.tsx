import { Outlet } from "react-router-dom";
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
