import { Outlet } from "react-router";
import { VotersActions } from "./actions";

export function VotersLayout() {
	return (
		<>
			<VotersActions />
			<Outlet />
		</>
	);
}
