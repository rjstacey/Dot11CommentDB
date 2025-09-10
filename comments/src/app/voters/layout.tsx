import { Outlet } from "react-router";
import VotersActions from "./actions";

function VotersLayout() {
	return (
		<>
			<VotersActions />
			<Outlet />
		</>
	);
}

export default VotersLayout;
