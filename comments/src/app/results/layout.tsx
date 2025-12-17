import { Outlet } from "react-router";
import { ResultsActions } from "./actions";

export function ResultsLayout() {
	return (
		<>
			<ResultsActions />
			<Outlet />
		</>
	);
}
