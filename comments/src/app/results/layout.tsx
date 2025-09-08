import { Outlet } from "react-router";
import ResultsActions from "./actions";

function ResultsLayout() {
	return (
		<>
			<ResultsActions />
			<Outlet />
		</>
	);
}

export default ResultsLayout;
